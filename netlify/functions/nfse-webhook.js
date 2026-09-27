/**
 * POST /api/webhooks/nfse/:provider — retorno dos emissores de NFS-e.
 *
 *   /api/webhooks/nfse/notaas  → eventos nfse.issued / nfse.error / nfse.cancelled /
 *                                nfse.documents_ready (assinatura X-Notaas-Signature)
 *   /api/webhooks/nfse/asaas   → eventos INVOICE_* (header asaas-access-token)
 *
 * O adaptador valida e normaliza; aqui só localizamos a nota por provider_ref
 * e aplicamos o estado. Respostas 2xx sempre que o evento foi entendido, mesmo
 * que ignorado, para o emissor não ficar reenviando.
 */

import { getProvider, findByProviderRef, applyProviderUpdate } from './lib/nfse/index.js';

function text(status, body) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });
}

export default async (req, context) => {
  if (req.method !== 'POST') return text(405, 'Method not allowed');

  const providerName = String(context.params?.provider || '').toLowerCase();
  const provider = getProvider(providerName);
  if (!provider) return text(404, 'unknown provider');

  const rawBody = await req.text();
  const parsed = provider.parseWebhook({ rawBody, headers: req.headers });

  if (!parsed.valid) {
    console.warn(`Webhook NFS-e (${providerName}): assinatura inválida`);
    return text(401, 'invalid signature');
  }
  if (parsed.ignored) return text(200, 'ok');

  let invoice;
  try {
    invoice = await findByProviderRef(providerName, parsed.providerRef);
  } catch (err) {
    console.error('Webhook NFS-e: falha ao consultar invoices', err.message);
    return text(500, 'db error');
  }
  if (!invoice) {
    console.warn(`Webhook NFS-e (${providerName}): nota desconhecida`, parsed.providerRef);
    return text(200, 'ok');
  }

  try {
    const update = parsed.refresh
      ? await provider.fetchStatus(parsed.providerRef)
      : parsed.update;
    await applyProviderUpdate(invoice, update, { event: parsed.event, payload: parsed.payload });
  } catch (err) {
    console.error('Webhook NFS-e: falha ao aplicar atualização', err.message);
    // 500 → o emissor reenvia depois.
    return text(500, 'error');
  }

  return text(200, 'ok');
};

export const config = {
  path: '/api/webhooks/nfse/:provider',
};
