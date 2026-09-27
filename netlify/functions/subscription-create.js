/**
 * POST /api/subscription/create — inicia o checkout de assinatura no Mercado Pago.
 *
 * Recebe { planId } com o access token do Supabase no header Authorization.
 * Valida o usuário, busca o plano no banco e cria uma "preapproval" (assinatura)
 * pendente no Mercado Pago. Devolve { url } (init_point) para redirecionar o
 * usuário ao checkout hospedado do MP.
 *
 * A assinatura só é gravada em `subscriptions` pelo webhook (mp-webhook.js),
 * quando o MP confirmar a autorização — aqui nada é persistido.
 *
 * Exige dados fiscais (billing_profiles com CPF/CNPJ) antes de abrir o checkout:
 * sem eles a NFS-e de cada cobrança não pode ser emitida. Responde 412 com
 * code "billing_profile_required" para o front abrir o formulário.
 *
 * Env (Netlify):
 *   MP_ACCESS_TOKEN            — token de acesso do Mercado Pago (produção ou teste)
 *   SUPABASE_URL               — https://<projeto>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  — service role (valida token e lê planos)
 *   URL                        — injetada pelo Netlify (site em produção)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const MP_API = 'https://api.mercadopago.com';

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const { MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: 'Server configuration error' });
  }

  // --- Autenticação: valida o access token do Supabase -----------------------
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return jsonResponse(401, { error: 'Não autenticado' });
  }

  const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userResp.ok) {
    return jsonResponse(401, { error: 'Sessão inválida ou expirada' });
  }
  const user = await userResp.json();

  // --- Dados fiscais (obrigatórios para a NFS-e) ----------------------------
  const profileResp = await fetch(
    `${SUPABASE_URL}/rest/v1/billing_profiles?user_id=eq.${user.id}&select=tax_id&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
  const profiles = profileResp.ok ? await profileResp.json() : [];
  if (!profiles[0]?.tax_id) {
    return jsonResponse(412, {
      error: 'Informe seu CPF ou CNPJ para emissão da nota fiscal antes de assinar.',
      code: 'billing_profile_required',
    });
  }

  // --- Plano ----------------------------------------------------------------
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Corpo inválido' });
  }
  const { planId } = body || {};
  if (!planId) {
    return jsonResponse(400, { error: 'planId é obrigatório' });
  }

  const planResp = await fetch(
    `${SUPABASE_URL}/rest/v1/plans?id=eq.${encodeURIComponent(planId)}&is_active=eq.true&select=*`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
  const plans = planResp.ok ? await planResp.json() : [];
  const plan = plans[0];
  if (!plan) {
    return jsonResponse(404, { error: 'Plano não encontrado' });
  }

  // --- Cria a assinatura (preapproval) no Mercado Pago ----------------------
  const siteUrl = process.env.URL || new URL(req.url).origin;
  const autoRecurring = {
    // MP não tem frequency_type "years": plano anual = a cada 12 meses.
    frequency: plan.interval === 'year' ? 12 : 1,
    frequency_type: 'months',
    transaction_amount: Math.round(plan.price_cents) / 100,
    currency_id: plan.currency || 'BRL',
  };
  if (plan.trial_days > 0) {
    autoRecurring.free_trial = { frequency: plan.trial_days, frequency_type: 'days' };
  }

  const mpResp = await fetch(`${MP_API}/preapproval`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason: `Fluxo Pro — ${plan.name}`,
      external_reference: `${user.id}|${plan.id}`,
      payer_email: user.email,
      auto_recurring: autoRecurring,
      back_url: `${siteUrl}/assinar/retorno`,
      status: 'pending',
    }),
  });

  if (!mpResp.ok) {
    const detail = await mpResp.text();
    console.error('Mercado Pago preapproval error:', mpResp.status, detail);
    return jsonResponse(502, { error: 'Falha ao criar o checkout no Mercado Pago' });
  }

  const preapproval = await mpResp.json();
  return jsonResponse(200, { url: preapproval.init_point, subscriptionId: preapproval.id });
};

export const config = {
  // Caminho principal neutro (adblockers bloqueiam URLs com "subscription");
  // o antigo fica como alias para compatibilidade.
  path: ['/api/pagamento/checkout', '/api/subscription/create'],
};
