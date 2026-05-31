import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

/**
 * useSubscription — lê a assinatura atual do usuário logado.
 *
 * O RLS garante que só retorna a linha do próprio usuário. Filtramos pelos
 * status "vivos" e pegamos a mais recente para evitar conflito com
 * assinaturas canceladas no histórico.
 *
 * Retorna:
 *   - subscription: objeto da assinatura (ou null)
 *   - isActive: boolean (trial/active e dentro do período pago)
 *   - features: objeto de recursos do plano (jsonb)
 *   - loading
 */
export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    supabase
      .from('subscriptions')
      .select('status, current_period_end, trial_ends_at, plans(code, name, features)')
      .in('status', ['trialing', 'active', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setSubscription(data);
        setLoading(false);
      });

    return () => { mounted = false; };
  }, [user]);

  const isActive = !!subscription &&
    ['trialing', 'active'].includes(subscription.status) &&
    (!subscription.current_period_end ||
      new Date(subscription.current_period_end) > new Date());

  const features = subscription?.plans?.features ?? {};

  return { subscription, isActive, features, loading };
}
