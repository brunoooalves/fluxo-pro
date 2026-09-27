import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import Logo from './Logo';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 30; // ~90s de espera pelo webhook

/**
 * Retorno do checkout do Mercado Pago (rota /assinar/retorno).
 *
 * O pagamento é confirmado de forma assíncrona (webhook → subscriptions),
 * então esta tela fica consultando a assinatura até ativar ou dar timeout.
 */
export default function AssinarRetorno() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState('checking'); // checking | active | timeout
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user) {
      navigate('/login', { replace: true, state: { from: { pathname: '/assinar/retorno' } } });
      return undefined;
    }

    let cancelled = false;

    const check = async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('status')
        .in('status', ['trialing', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (data) {
        setState('active');
        return;
      }
      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setState('timeout');
        return;
      }
      setTimeout(check, POLL_INTERVAL_MS);
    };

    check();
    return () => { cancelled = true; };
  }, [authLoading, user, navigate]);

  return (
    <div className="min-h-screen bg-surface-base px-4 py-10">
      <div className="max-w-lg mx-auto">
        <header className="flex justify-center mb-10">
          <Logo size="md" to="/" />
        </header>

        <Card variant="outlined" padding="lg" className="text-center">
          {state === 'checking' && (
            <>
              <Loader2 size={40} className="animate-spin text-brand-500 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-ink-base">Confirmando seu pagamento…</h1>
              <p className="text-ink-muted mt-2 text-sm">
                Aguardando a confirmação do Mercado Pago. Isso costuma levar poucos segundos.
              </p>
            </>
          )}

          {state === 'active' && (
            <>
              <CheckCircle2 size={40} className="text-status-success mx-auto mb-3" />
              <h1 className="text-xl font-bold text-ink-base">Assinatura ativa!</h1>
              <p className="text-ink-muted mt-2 text-sm">
                Tudo certo — bem-vindo ao Fluxo Pro.
              </p>
              <div className="mt-6">
                <Button
                  variant="primary"
                  icon={<ArrowRight size={16} />}
                  onClick={() => navigate('/calculadora', { replace: true })}
                >
                  Começar a simular
                </Button>
              </div>
            </>
          )}

          {state === 'timeout' && (
            <>
              <Clock size={40} className="text-status-warning mx-auto mb-3" />
              <h1 className="text-xl font-bold text-ink-base">Pagamento em processamento</h1>
              <p className="text-ink-muted mt-2 text-sm">
                Ainda não recebemos a confirmação do Mercado Pago. Se você concluiu o
                pagamento, o acesso será liberado automaticamente em alguns minutos —
                tente entrar na calculadora ou volte aos planos.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button variant="secondary" onClick={() => navigate('/assinar')}>
                  Ver planos
                </Button>
                <Button variant="primary" onClick={() => navigate('/calculadora')}>
                  Tentar acessar
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
