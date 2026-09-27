/**
 * POST /api/webhooks/mercadopago — webhook de assinaturas do Mercado Pago.
 *
 * O MP notifica (subscription_preapproval / subscription_authorized_payment),
 * buscamos o estado real da preapproval na API e fazemos upsert em
 * `subscriptions` (via service role, que ignora RLS).
 *
 * Mapeamento de status MP → app:
 *   authorized → active     (assinatura valendo; cobre também o período de trial)
 *   paused     → past_due   (cobrança interrompida; app mostra mas alerta)
 *   cancelled  → canceled
 *   pending    → (ignorado — usuário ainda não concluiu o checkout)
 *
 * O vínculo usuário↔plano vem do external_reference "userId|planId" gravado
 * na criação (subscription-create.js).
 *
 * NFS-e: a cada cobrança aprovada (subscription_authorized_payment com pagamento
 * approved, ou evento `payment` approved ligado a uma preapproval) registramos a
 * nota em `invoices` (idempotente pelo id do pagamento) e disparamos a emissão
 * via lib/nfse (Notaas → Asaas). Falha na emissão não derruba o webhook: a
 * função agendada nfse-retry reprocessa.
 *
 * Env (Netlify):
 *   MP_ACCESS_TOKEN            — token de acesso do Mercado Pago
 *   MP_WEBHOOK_SECRET          — assinatura secreta do webhook (painel do MP);
 *                                se definida, a assinatura x-signature é exigida
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 */

import crypto from 'node:crypto';
import { recordPaidInvoice, processInvoice } from './lib/nfse/index.js';

const MP_API = 'https://api.mercadopago.com';

const STATUS_MAP = {
  authorized: 'active',
  paused: 'past_due',
  cancelled: 'canceled',
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Valida o header x-signature ("ts=...,v1=...") conforme a doc do MP:
 * HMAC-SHA256 do manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`.
 */
function isValidSignature(req, dataId, secret) {
  const signature = req.headers.get('x-signature') || '';
  const requestId = req.headers.get('x-request-id') || '';
  const parts = Object.fromEntries(
    signature.split(',').map((p) => p.trim().split('=').map((s) => s.trim()))
  );
  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  } catch {
    return false;
  }
}

async function mpGet(path, accessToken) {
  const resp = await fetch(`${MP_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) return null;
  return resp.json();
}

export default async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const { MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } =
    process.env;
  if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: 'Server configuration error' });
  }

  const url = new URL(req.url);
  let body = {};
  try {
    body = await req.json();
  } catch {
    /* alguns eventos chegam sem corpo JSON */
  }

  const type = body.type || url.searchParams.get('type') || url.searchParams.get('topic') || '';
  const dataId = body.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id');

  if (!dataId) {
    return json(200, { ignored: true });
  }

  if (MP_WEBHOOK_SECRET && !isValidSignature(req, dataId, MP_WEBHOOK_SECRET)) {
    console.warn('Webhook MP: assinatura inválida para', type, dataId);
    return json(401, { error: 'Invalid signature' });
  }

  // --- Resolve a preapproval a partir do evento -----------------------------
  // `paid` só é preenchido quando o evento representa uma cobrança aprovada
  // (é o gatilho da NFS-e): { paymentId, amount, currency, paidAt }.
  let preapprovalId = null;
  let paid = null;
  if (type === 'subscription_preapproval' || type === 'preapproval') {
    preapprovalId = dataId;
  } else if (type === 'subscription_authorized_payment') {
    // Cobrança recorrente: o id é do pagamento autorizado; buscamos a assinatura.
    const authorizedPayment = await mpGet(`/authorized_payments/${dataId}`, MP_ACCESS_TOKEN);
    preapprovalId = authorizedPayment?.preapproval_id || null;
    if (authorizedPayment?.payment?.status === 'approved') {
      paid = {
        paymentId: authorizedPayment.payment.id,
        amount: authorizedPayment.transaction_amount,
        currency: authorizedPayment.currency_id,
        paidAt: authorizedPayment.debit_date || authorizedPayment.last_modified || null,
      };
    }
  } else if (type === 'payment') {
    // Evento de pagamento avulso: só interessa se for de uma assinatura.
    const payment = await mpGet(`/v1/payments/${dataId}`, MP_ACCESS_TOKEN);
    preapprovalId = payment?.metadata?.preapproval_id || null;
    if (!preapprovalId) return json(200, { ignored: true, type, reason: 'pagamento sem assinatura' });
    if (payment.status === 'approved') {
      paid = {
        paymentId: payment.id,
        amount: payment.transaction_amount,
        currency: payment.currency_id,
        paidAt: payment.date_approved || null,
      };
    }
  } else {
    return json(200, { ignored: true, type });
  }

  if (!preapprovalId) {
    return json(200, { ignored: true, reason: 'preapproval não encontrada' });
  }

  const preapproval = await mpGet(`/preapproval/${preapprovalId}`, MP_ACCESS_TOKEN);
  if (!preapproval) {
    console.error('Webhook MP: falha ao buscar preapproval', preapprovalId);
    return json(500, { error: 'Falha ao consultar o Mercado Pago' });
  }

  const status = STATUS_MAP[preapproval.status];
  if (!status) {
    // pending/estados intermediários: nada a persistir ainda.
    return json(200, { ignored: true, mpStatus: preapproval.status });
  }

  const [userId, planId] = String(preapproval.external_reference || '').split('|');
  if (!userId || !planId) {
    console.error('Webhook MP: external_reference inválido', preapproval.external_reference);
    return json(200, { ignored: true, reason: 'external_reference inválido' });
  }

  // Fim do período corrente: próxima cobrança informada pelo MP; na ausência,
  // estima pelo intervalo do plano a partir de agora.
  let currentPeriodEnd = preapproval.next_payment_date || null;
  if (!currentPeriodEnd) {
    const months = preapproval.auto_recurring?.frequency || 1;
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    currentPeriodEnd = d.toISOString();
  }

  const upsertResp = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?on_conflict=gateway_subscription_id`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify([
        {
          user_id: userId,
          plan_id: planId,
          status,
          gateway: 'mercadopago',
          gateway_subscription_id: preapproval.id,
          current_period_end: currentPeriodEnd,
        },
      ]),
    }
  );

  if (!upsertResp.ok) {
    const detail = await upsertResp.text();
    console.error('Webhook MP: upsert falhou', upsertResp.status, detail);
    // 500 → o MP reenvia a notificação depois.
    return json(500, { error: 'Falha ao gravar assinatura' });
  }
  const [subscriptionRow] = await upsertResp.json().catch(() => []);

  // --- NFS-e: cobrança aprovada → registra e dispara a emissão --------------
  let invoiceId = null;
  if (paid && paid.paymentId && paid.amount > 0) {
    try {
      const invoice = await recordPaidInvoice({
        userId,
        subscriptionId: subscriptionRow?.id || null,
        planId,
        gatewayPaymentId: paid.paymentId,
        amountCents: paid.amount * 100,
        currency: paid.currency || 'BRL',
        paidAt: paid.paidAt,
      });
      if (invoice) {
        invoiceId = invoice.id;
        // Emissão é assíncrona no emissor; aqui só enfileiramos. Erros ficam
        // gravados na própria nota e voltam pela nfse-retry.
        await processInvoice(invoice);
      }
    } catch (err) {
      console.error('Webhook MP: falha ao registrar NFS-e', err.message);
    }
  }

  return json(200, { ok: true, status, preapprovalId: preapproval.id, invoiceId });
};

export const config = {
  path: '/api/webhooks/mercadopago',
};
