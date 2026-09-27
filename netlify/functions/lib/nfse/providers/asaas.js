/**
 * Adaptador Asaas (https://docs.asaas.com) — emissor reserva.
 *
 * Emite "nota avulsa" (POST /v3/invoices com `customer`, sem cobrança Asaas).
 * A cobrança continua no Mercado Pago. Precisa da configuração fiscal feita
 * no painel do Asaas (certificado, município, serviço municipal).
 *
 * Env:
 *   ASAAS_API_KEY                 — chave de API da conta
 *   ASAAS_BASE_URL                — https://api.asaas.com/v3 (prod) ou
 *                                   https://api-sandbox.asaas.com/v3 (sandbox)
 *   ASAAS_WEBHOOK_TOKEN           — token configurado no webhook (header asaas-access-token)
 *   ASAAS_MUNICIPAL_SERVICE_CODE  — código do serviço no formato da LC 116 (ex. 1.05)
 *   ASAAS_MUNICIPAL_SERVICE_NAME  — nome do serviço como cadastrado na prefeitura
 *   ASAAS_MUNICIPAL_SERVICE_ID    — (opcional) id do serviço municipal no Asaas
 *   NFSE_ISS_RATE                 — alíquota de ISS em %
 */

const BASE_URL = process.env.ASAAS_BASE_URL || 'https://api.asaas.com/v3';

export const name = 'asaas';

export function isConfigured() {
  return Boolean(
    process.env.ASAAS_API_KEY &&
    process.env.ASAAS_MUNICIPAL_SERVICE_CODE &&
    process.env.ASAAS_MUNICIPAL_SERVICE_NAME
  );
}

const STATUS_MAP = {
  SCHEDULED: 'processing',
  SYNCHRONIZED: 'processing',
  AUTHORIZED: 'issued',
  PROCESSING_CANCELLATION: 'issued',
  CANCELED: 'canceled',
  CANCELLATION_DENIED: 'issued',
  ERROR: 'error',
};

async function api(method, path, body) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      access_token: process.env.ASAAS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'FluxoPro/1.0',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await resp.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* corpo não-JSON */ }
  if (!resp.ok) {
    const detail = json?.errors?.map((e) => e.description).join('; ') || text;
    const err = new Error(`Asaas ${resp.status}: ${detail}`);
    err.status = resp.status;
    err.retryable = resp.status >= 500 || resp.status === 429;
    throw err;
  }
  return json;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Garante o cliente no Asaas (por CPF/CNPJ). Devolve o id (cus_...).
 * O orquestrador grava o id em billing_profiles.asaas_customer_id para reuso.
 */
export async function ensureCustomer(profile) {
  if (profile.asaas_customer_id) return profile.asaas_customer_id;

  const found = await api('GET', `/customers?cpfCnpj=${encodeURIComponent(profile.tax_id)}&limit=1`);
  if (found?.data?.length) return found.data[0].id;

  const created = await api('POST', '/customers', {
    name: profile.name,
    cpfCnpj: profile.tax_id,
    email: profile.email || undefined,
    postalCode: profile.cep || undefined,
    address: profile.logradouro || undefined,
    addressNumber: profile.numero || undefined,
    complement: profile.complemento || undefined,
    province: profile.bairro || undefined,
    externalReference: profile.user_id,
    notificationDisabled: true,
  });
  return created.id;
}

export async function issue({ invoice, profile, description }) {
  const customerId = await ensureCustomer(profile);

  const body = {
    customer: customerId,
    serviceDescription: description,
    observations: description,
    externalReference: invoice.id,
    value: invoice.amount_cents / 100,
    deductions: 0,
    effectiveDate: todayISO(),
    municipalServiceCode: process.env.ASAAS_MUNICIPAL_SERVICE_CODE,
    municipalServiceName: process.env.ASAAS_MUNICIPAL_SERVICE_NAME,
    ...(process.env.ASAAS_MUNICIPAL_SERVICE_ID
      ? { municipalServiceId: process.env.ASAAS_MUNICIPAL_SERVICE_ID }
      : {}),
    taxes: {
      retainIss: false,
      iss: Number(process.env.NFSE_ISS_RATE || 0),
      cofins: 0,
      csll: 0,
      inss: 0,
      ir: 0,
      pis: 0,
    },
  };

  const resp = await api('POST', '/invoices', body);
  return {
    providerRef: resp.id,
    status: STATUS_MAP[resp.status] || 'processing',
    providerStatus: resp.status,
    customerId,
  };
}

function normalize(inv) {
  return {
    status: STATUS_MAP[inv.status] || 'processing',
    providerStatus: inv.status,
    invoiceNumber: inv.number || null,
    verificationCode: inv.validationCode || null,
    pdfUrl: inv.pdfUrl || null,
    xmlUrl: inv.xmlUrl || null,
    issuedAt: null,
    errorMessage: inv.status === 'ERROR' ? (inv.statusDescription || 'Erro na emissão (Asaas)') : null,
  };
}

export async function fetchStatus(providerRef) {
  const inv = await api('GET', `/invoices/${encodeURIComponent(providerRef)}`);
  return normalize(inv);
}

export async function cancel(providerRef) {
  return api('POST', `/invoices/${encodeURIComponent(providerRef)}/cancel`);
}

/**
 * Webhook do Asaas: validação pelo header `asaas-access-token` (valor definido
 * ao cadastrar o webhook no painel). Só eventos INVOICE_* interessam.
 */
export function parseWebhook({ rawBody, headers }) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (expected && headers.get('asaas-access-token') !== expected) {
    return { valid: false };
  }

  let body = {};
  try { body = JSON.parse(rawBody); } catch { return { valid: false }; }

  const event = body?.event || '';
  if (!event.startsWith('INVOICE_') || !body.invoice?.id) {
    return { valid: true, ignored: true, event };
  }

  return {
    valid: true,
    event,
    deliveryId: body.id || null,
    providerRef: body.invoice.id,
    refresh: false,
    update: normalize(body.invoice),
    payload: body,
  };
}
