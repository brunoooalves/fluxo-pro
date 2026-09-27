/**
 * Orquestrador de NFS-e — independente do emissor.
 *
 * Fluxo:
 *   pagamento aprovado (mp-webhook) → recordPaidInvoice() grava `invoices`
 *   (idempotente por gateway_payment_id) → processInvoice() escolhe o emissor,
 *   emite e grava provider/provider_ref → o emissor responde por webhook
 *   (nfse-webhook) → applyProviderUpdate() fecha a nota (issued/error).
 *   nfse-retry (agendada) reprocessa pendentes/erros e reconcilia as que
 *   ficaram em processing sem retorno.
 *
 * Failover: NFSE_PROVIDERS="notaas,asaas" (ordem de preferência). Após
 * NFSE_FAILOVER_AFTER_ATTEMPTS tentativas falhas no primeiro, passa ao próximo.
 * Para forçar um emissor, defina NFSE_PROVIDERS="asaas".
 */

import { sbInsert, sbSelectOne, sbUpdate } from '../supabase.js';
import * as notaas from './providers/notaas.js';
import * as asaas from './providers/asaas.js';

const REGISTRY = { notaas, asaas };

const MAX_ATTEMPTS = Number(process.env.NFSE_MAX_ATTEMPTS || 8);
const FAILOVER_AFTER = Number(process.env.NFSE_FAILOVER_AFTER_ATTEMPTS || 2);
// Backoff por tentativa (minutos): 5m, 30m, 2h, 6h, 24h, 24h...
const BACKOFF_MINUTES = [5, 30, 120, 360, 1440];

export function providerChain() {
  const names = (process.env.NFSE_PROVIDERS || 'notaas,asaas')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return names
    .map((n) => REGISTRY[n])
    .filter((p) => p && p.isConfigured());
}

export function getProvider(name) {
  return REGISTRY[name] || null;
}

function pickProvider(attempts) {
  const chain = providerChain();
  if (!chain.length) return null;
  const idx = Math.min(Math.floor(attempts / FAILOVER_AFTER), chain.length - 1);
  return chain[idx];
}

function nextAttemptAt(attempts) {
  const minutes = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)];
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function competenceOf(date) {
  const d = date ? new Date(date) : new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function buildDescription(plan, invoice) {
  const [year, month] = String(invoice.competence).split('-');
  const template =
    process.env.NFSE_SERVICE_DESCRIPTION ||
    'Assinatura Fluxo Pro - Plano {plano} - competencia {competencia}';
  return template
    .replace('{plano}', plan?.name || 'Pro')
    .replace('{competencia}', `${month}/${year}`);
}

export async function logEvent(invoiceId, provider, event, payload) {
  try {
    await sbInsert('invoice_events', { invoice_id: invoiceId, provider, event, payload });
  } catch (err) {
    console.error('NFS-e: falha ao registrar evento', event, err.message);
  }
}

/**
 * Registra o pagamento aprovado como nota pendente. Devolve a linha criada,
 * ou null se já existia (webhook reenviado).
 */
export async function recordPaidInvoice({
  userId,
  subscriptionId = null,
  planId = null,
  gateway = 'mercadopago',
  gatewayPaymentId,
  amountCents,
  currency = 'BRL',
  paidAt = null,
}) {
  const rows = await sbInsert(
    'invoices',
    {
      user_id: userId,
      subscription_id: subscriptionId,
      plan_id: planId,
      gateway,
      gateway_payment_id: String(gatewayPaymentId),
      amount_cents: Math.round(amountCents),
      currency,
      competence: competenceOf(paidAt),
      status: 'pending',
    },
    { onConflict: 'gateway,gateway_payment_id', ignoreDuplicates: true }
  );
  const invoice = Array.isArray(rows) && rows.length ? rows[0] : null;
  if (invoice) await logEvent(invoice.id, gateway, 'payment_recorded', { gatewayPaymentId, amountCents });
  return invoice;
}

/**
 * Tenta emitir a nota. Nunca lança: o resultado fica gravado em `invoices`.
 * Devolve a linha atualizada.
 */
export async function processInvoice(invoice) {
  const attempts = (invoice.attempts || 0) + 1;

  const profile = await sbSelectOne(
    `billing_profiles?user_id=eq.${invoice.user_id}&select=*`
  );
  if (!profile?.tax_id) {
    // Sem CPF/CNPJ não dá para emitir. Não conta tentativa: a retentativa
    // volta a olhar quando o usuário preencher (a cada ciclo agendado).
    return patch(invoice.id, {
      status: 'error',
      error_message: 'Dados fiscais do assinante não informados (CPF/CNPJ)',
      next_attempt_at: new Date(Date.now() + 6 * 3_600_000).toISOString(),
    });
  }

  const provider = pickProvider(invoice.attempts || 0);
  if (!provider) {
    return patch(invoice.id, {
      status: 'error',
      error_message: 'Nenhum emissor de NFS-e configurado (NFSE_PROVIDERS)',
      next_attempt_at: nextAttemptAt(attempts),
    });
  }

  const plan = invoice.plan_id
    ? await sbSelectOne(`plans?id=eq.${invoice.plan_id}&select=name,code`)
    : null;
  const description = buildDescription(plan, invoice);

  try {
    const result = await provider.issue({ invoice, profile, description });

    if (result.customerId && result.customerId !== profile.asaas_customer_id) {
      await sbUpdate(`billing_profiles?user_id=eq.${invoice.user_id}`, {
        asaas_customer_id: result.customerId,
      }).catch(() => {});
    }

    await logEvent(invoice.id, provider.name, 'issue_requested', { attempts, result });
    return patch(invoice.id, {
      provider: provider.name,
      provider_ref: result.providerRef,
      provider_status: result.providerStatus,
      status: result.status,
      attempts,
      error_message: null,
      next_attempt_at: new Date(Date.now() + 30 * 60_000).toISOString(), // reconciliação
    });
  } catch (err) {
    console.error(`NFS-e: falha ao emitir via ${provider.name} (tentativa ${attempts})`, err.message);
    await logEvent(invoice.id, provider.name, 'issue_failed', { attempts, error: err.message });
    return patch(invoice.id, {
      provider: provider.name,
      status: 'error',
      attempts,
      error_message: err.message.slice(0, 1000),
      next_attempt_at: nextAttemptAt(attempts),
    });
  }
}

/** Aplica um estado normalizado vindo do emissor (webhook ou consulta). */
export async function applyProviderUpdate(invoice, update, { event = 'status', payload = null } = {}) {
  await logEvent(invoice.id, invoice.provider, event, payload ?? update);

  const fields = {
    provider_status: update.providerStatus ?? invoice.provider_status,
    status: update.status,
  };
  if (update.invoiceNumber) fields.invoice_number = update.invoiceNumber;
  if (update.verificationCode) fields.verification_code = update.verificationCode;
  if (update.pdfUrl) fields.pdf_url = update.pdfUrl;
  if (update.xmlUrl) fields.xml_url = update.xmlUrl;

  if (update.status === 'issued') {
    fields.error_message = null;
    fields.issued_at = update.issuedAt || invoice.issued_at || new Date().toISOString();
  } else if (update.status === 'error') {
    fields.error_message = (update.errorMessage || 'Emissão rejeitada pelo emissor').slice(0, 1000);
    // Rejeição do emissor: agenda nova tentativa (que pode cair no failover).
    fields.next_attempt_at = nextAttemptAt(invoice.attempts || 1);
  } else if (update.status === 'processing') {
    fields.next_attempt_at = new Date(Date.now() + 30 * 60_000).toISOString();
  }

  return patch(invoice.id, fields);
}

/** Consulta o emissor e sincroniza (para notas em processing sem webhook). */
export async function reconcile(invoice) {
  const provider = getProvider(invoice.provider);
  if (!provider || !invoice.provider_ref) return invoice;
  try {
    const update = await provider.fetchStatus(invoice.provider_ref);
    return applyProviderUpdate(invoice, update, { event: 'reconciled' });
  } catch (err) {
    console.error('NFS-e: falha na reconciliação', invoice.id, err.message);
    return patch(invoice.id, { next_attempt_at: nextAttemptAt(2) });
  }
}

export function canRetry(invoice) {
  return (invoice.attempts || 0) < MAX_ATTEMPTS;
}

export async function findByProviderRef(provider, providerRef) {
  return sbSelectOne(
    `invoices?provider=eq.${provider}&provider_ref=eq.${encodeURIComponent(providerRef)}&select=*`
  );
}

async function patch(invoiceId, fields) {
  const rows = await sbUpdate(`invoices?id=eq.${invoiceId}`, fields);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
