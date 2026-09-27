import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import Logo from './Logo';
import Modal from './ui/Modal';
import PlansSection from './PlansSection';
import BillingProfileForm from './BillingProfileForm';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { criarCheckoutAssinatura } from '../utils/subscriptionApi';
import { fetchBillingProfile } from '../utils/billingProfile';

/**
 * Página de planos / assinatura (rota pública /assinar).
 *
 * Logado sem assinatura → botão "Assinar" cria o checkout no Mercado Pago e
 * redireciona. Deslogado → manda para /login (que volta para cá). Com
 * assinatura ativa → mostra o plano atual e o atalho para a calculadora.
 *
 * Antes do checkout exigimos os dados fiscais (CPF/CNPJ) em `billing_profiles`:
 * são o tomador da NFS-e emitida a cada cobrança. Sem eles, abre o formulário
 * e só depois segue para o Mercado Pago.
 */
export default function Assinar() {
  const { user, signOut, isConfigured } = useAuth();
  const { subscription, isActive, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  const [busyPlanId, setBusyPlanId] = useState(null);
  const [error, setError] = useState('');
  const [billingProfile, setBillingProfile] = useState(undefined); // undefined = carregando
  const [pendingPlan, setPendingPlan] = useState(null); // plano escolhido aguardando dados fiscais

  useEffect(() => {
    if (!isConfigured || !user) {
      setBillingProfile(null);
      return;
    }
    fetchBillingProfile().then(setBillingProfile).catch(() => setBillingProfile(null));
  }, [isConfigured, user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const startCheckout = async (plan) => {
    setBusyPlanId(plan.id);
    try {
      const url = await criarCheckoutAssinatura(plan.id);
      window.location.assign(url);
    } catch (err) {
      setBusyPlanId(null);
      if (err.code === 'billing_profile_required') {
        setPendingPlan(plan);
        return;
      }
      setError(err.message);
    }
  };

  const handleSubscribe = async (plan) => {
    setError('');
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/assinar' } } });
      return;
    }
    if (!billingProfile?.tax_id) {
      setPendingPlan(plan);
      return;
    }
    await startCheckout(plan);
  };

  const handleBillingSaved = async (profile) => {
    setBillingProfile(profile);
    const plan = pendingPlan;
    setPendingPlan(null);
    if (plan) await startCheckout(plan);
  };

  const showActivePlan = isConfigured && user && !subLoading && isActive;

  return (
    <div className="min-h-screen bg-surface-base px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <Logo size="md" to="/" />
          {user && (
            <Button variant="ghost" size="sm" icon={<LogOut size={14} />} onClick={handleSignOut}>
              Sair
            </Button>
          )}
        </header>

        {showActivePlan ? (
          <Card variant="outlined" padding="lg" className="max-w-lg mx-auto text-center">
            <CheckCircle2 size={40} className="text-status-success mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-ink-base">
              Plano {subscription?.plans?.name || 'ativo'}
            </h1>
            <p className="text-ink-muted mt-2 text-sm">
              Sua assinatura está ativa
              {subscription?.current_period_end && (
                <> até {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}</>
              )}.
            </p>
            <div className="mt-6">
              <Button
                variant="primary"
                icon={<ArrowRight size={16} />}
                onClick={() => navigate('/calculadora')}
              >
                Ir para a calculadora
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-ink-base">Escolha seu plano</h1>
              <p className="text-ink-muted mt-2">Assine para usar a calculadora sem limites.</p>
            </div>

            {error && (
              <div className="max-w-lg mx-auto mb-6 flex items-start gap-2 rounded-lg bg-status-error-bg p-3 text-sm text-status-error-text">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <PlansSection onSubscribe={handleSubscribe} busyPlanId={busyPlanId} />

            <p className="text-center text-xs text-ink-faint mt-8">
              Pagamento processado com segurança pelo Mercado Pago. Cancele quando quiser.
              Nota fiscal (NFS-e) emitida automaticamente a cada cobrança.
            </p>
          </>
        )}
      </div>

      <Modal
        open={!!pendingPlan}
        onClose={() => setPendingPlan(null)}
        title="Dados para a nota fiscal"
        description={pendingPlan ? `Plano ${pendingPlan.name}` : undefined}
        size="lg"
      >
        {pendingPlan && (
          <BillingProfileForm
            user={user}
            initial={billingProfile}
            submitLabel="Salvar e ir para o pagamento"
            onCancel={() => setPendingPlan(null)}
            onSaved={handleBillingSaved}
          />
        )}
      </Modal>
    </div>
  );
}
