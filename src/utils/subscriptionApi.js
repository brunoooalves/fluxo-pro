import { supabase } from '../lib/supabaseClient';

/**
 * Inicia o checkout de assinatura no Mercado Pago via Netlify Function.
 *
 * Envia o access token da sessão Supabase; a function valida o usuário,
 * cria a preapproval no MP e devolve a URL do checkout hospedado.
 *
 * @param {string} planId - id (uuid) do plano na tabela `plans`
 * @returns {Promise<string>} URL do checkout para redirecionar o usuário
 */
export async function criarCheckoutAssinatura(planId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('É preciso estar logado para assinar.');
  }

  let resp;
  try {
    // Caminho neutro ("subscription" na URL é alvo comum de adblockers).
    resp = await fetch('/api/pagamento/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ planId }),
    });
  } catch {
    // Falha de rede: conexão caiu ou extensão do navegador bloqueou a chamada.
    throw new Error(
      'Não foi possível conectar ao pagamento. Verifique sua internet e, se usar ' +
      'bloqueador de anúncios, desative-o para este site e tente novamente.'
    );
  }

  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || !body.url) {
    // Erros 5xx trazem mensagens técnicas do servidor (em inglês) — não expor.
    const friendly = resp.status >= 500 || !body.error
      ? 'O pagamento está temporariamente indisponível. Tente novamente em alguns minutos.'
      : body.error;
    const err = new Error(friendly);
    // ex.: 'billing_profile_required' (412) → o front abre o formulário fiscal.
    err.code = body.code || null;
    throw err;
  }
  return body.url;
}
