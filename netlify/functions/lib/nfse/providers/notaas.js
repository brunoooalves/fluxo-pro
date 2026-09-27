/**
 * Adaptador Notaas (https://docs.notaas.com.br) — emissor principal.
 *
 * API assíncrona: POST /emitir devolve invoiceId na hora; o resultado chega
 * por webhook (nfse.issued / nfse.error / nfse.cancelled / nfse.documents_ready)
 * ou por GET /invoices/{id}/status.
 *
 * Env:
 *   NOTAAS_API_KEY            — chave do projeto (prefixo ntaas_)
 *   NOTAAS_WEBHOOK_SECRET     — secret configurado no endpoint de webhook
 *   NOTAAS_SERVICE_CODE       — código do serviço no formato nacional (6 dígitos, ex. 010501)
 *   NOTAAS_MUNICIPAL_SERVICE_CODE — (opcional) código do serviço na prefeitura
 *   NOTAAS_MUNICIPAL_TAX_CODE — (opcional) código de tributação municipal
 *   NOTAAS_LOCAL_PRESTACAO    — (opcional) IBGE do município de prestação
 *   NFSE_ISS_RATE             — alíquota de ISS em % (ex. 2)
 */

import crypto from 'node:crypto';

const BASE_URL = process.env.NOTAAS_BASE_URL || 'https://platform.notaas.com.br/api/v1';

export const name = 'notaas';

export function isConfigured() {
  return Boolean(process.env.NOTAAS_API_KEY && process.env.NOTAAS_SERVICE_CODE);
}

const STATUS_MAP = {
  queued: 'processing',
  processing: 'processing',
  issued: 'issued',
  error: 'error',
  cancelled: 'canceled',
};

async function api(method, path, body) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'x-api-key': process.env.NOTAAS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await resp.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* corpo não-JSON */ }
  if (!resp.ok) {
    const err = new Error(`Notaas ${resp.status}: ${json?.message || json?.error || text}`);
    err.status = resp.status;
    err.retryable = resp.status >= 500 || resp.status === 429;
    throw err;
  }
  return json;
}

function omitEmpty(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

/**
 * Emite a nota. Recebe o "pedido" normalizado montado pelo orquestrador.
 * Devolve { providerRef, status, providerStatus }.
 */
export async function issue({ invoice, profile, description }) {
  const tomador = omitEmpty({
    nome: profile.name,
    cpf: profile.tax_id_type === 'cpf' ? profile.tax_id : undefined,
    cnpj: profile.tax_id_type === 'cnpj' ? profile.tax_id : undefined,
    email: profile.email || undefined,
    endereco: profile.logradouro
      ? omitEmpty({
          logradouro: profile.logradouro,
          numero: profile.numero || 'S/N',
          complemento: profile.complemento,
          bairro: profile.bairro,
          cidade: profile.cidade,
          uf: profile.uf,
          cep: profile.cep,
          pais: 'BR',
        })
      : undefined,
  });

  const body = {
    tomador,
    servico: omitEmpty({
      descricao: description,
      codigo: process.env.NOTAAS_SERVICE_CODE,
      codigoServico: process.env.NOTAAS_MUNICIPAL_SERVICE_CODE,
      codigoTributacaoMunicipal: process.env.NOTAAS_MUNICIPAL_TAX_CODE,
      localPrestacao: process.env.NOTAAS_LOCAL_PRESTACAO,
    }),
    valores: {
      total: invoice.amount_cents / 100,
      aliquotaIss: Number(process.env.NFSE_ISS_RATE || 0),
      issRetido: false,
    },
    competencia: String(invoice.competence).slice(0, 7), // YYYY-MM
    referencia: invoice.id,
  };

  const resp = await api('POST', '/emitir', body);
  return {
    providerRef: resp.invoiceId,
    status: STATUS_MAP[resp.status] || 'processing',
    providerStatus: resp.status,
  };
}

/** Consulta o estado atual da nota no emissor (usado após webhook e na reconciliação). */
export async function fetchStatus(providerRef) {
  const s = await api('GET', `/invoices/${encodeURIComponent(providerRef)}/status`);
  return {
    status: STATUS_MAP[s.status] || 'processing',
    providerStatus: s.status,
    invoiceNumber: s.numeroNfe || null,
    verificationCode: s.chNFSe || null,
    pdfUrl: s.pdfUrl || null,
    xmlUrl: s.xmlUrl || null,
    issuedAt: s.emittedAt || null,
    errorMessage: s.errorMessage ? `${s.errorCode || ''} ${s.errorMessage}`.trim() : null,
  };
}

export async function cancel(providerRef, reason) {
  return api('POST', '/cancelar', { invoiceId: providerRef, motivo: reason });
}

/**
 * Valida e normaliza o webhook. Assinatura: header X-Notaas-Signature =
 * "sha256=<hmac hex do corpo bruto>".
 * Devolve { providerRef, event, refresh: true } — o handler consulta o status
 * porque o payload do webhook não traz PDF/XML.
 */
export function parseWebhook({ rawBody, headers }) {
  const secret = process.env.NOTAAS_WEBHOOK_SECRET;
  if (secret) {
    const given = (headers.get('x-notaas-signature') || '').replace(/^sha256=/, '');
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    let ok = false;
    try { ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given)); } catch { ok = false; }
    if (!ok) return { valid: false };
  }

  let body = {};
  try { body = JSON.parse(rawBody); } catch { return { valid: false }; }

  const providerRef = body?.data?.invoiceId;
  if (!providerRef) return { valid: true, ignored: true, event: body?.event };

  return {
    valid: true,
    event: body.event,
    deliveryId: body.deliveryId || headers.get('x-notaas-delivery') || null,
    providerRef,
    refresh: true,
    payload: body,
  };
}
