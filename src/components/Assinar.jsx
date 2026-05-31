import React, { useEffect, useState } from 'react';
import { Check, Calculator, LogOut } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

/**
 * Página de planos / assinatura.
 *
 * Lê os planos ativos do Supabase (leitura pública via RLS). O botão de
 * assinar está desabilitado por enquanto — será ligado quando o checkout
 * do gateway (create-checkout) estiver pronto.
 */

const FEATURE_LABELS = {
  pdf: 'Exportação em PDF',
  compartilhamento: 'Link compartilhável',
  fipezap: 'Análise de valorização (FipeZap)',
  white_label: 'Relatórios sem marca',
};

function featureList(features = {}) {
  const items = [];
  for (const [key, label] of Object.entries(FEATURE_LABELS)) {
    if (features[key]) items.push(label);
  }
  if (features.max_imoveis === null || features.max_imoveis === undefined) {
    items.push('Imóveis salvos ilimitados');
  } else {
    items.push(`Até ${features.max_imoveis} imóveis salvos`);
  }
  if (features.simulacoes_mes === null || features.simulacoes_mes === undefined) {
    items.push('Simulações ilimitadas');
  } else {
    items.push(`${features.simulacoes_mes} simulações/mês`);
  }
  return items;
}

function formatPrice(cents, interval) {
  const value = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  return { value: `R$ ${value}`, suffix: interval === 'year' ? '/ano' : '/mês' };
}

export default function Assinar() {
  const { user, signOut } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setPlans(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-surface-base px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center">
              <Calculator size={18} />
            </div>
            <span className="text-lg font-bold text-ink-base">Fluxo Pro</span>
          </div>
          {user && (
            <Button variant="ghost" size="sm" icon={<LogOut size={14} />} onClick={() => signOut()}>
              Sair
            </Button>
          )}
        </header>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-ink-base">Escolha seu plano</h1>
          <p className="text-ink-muted mt-2">Assine para usar a calculadora sem limites.</p>
        </div>

        {loading ? (
          <p className="text-center text-ink-muted">Carregando planos...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const price = formatPrice(plan.price_cents, plan.interval);
              return (
                <Card key={plan.id} variant="outlined" padding="lg" className="flex flex-col">
                  <h2 className="text-lg font-semibold text-ink-base">{plan.name}</h2>
                  <div className="mt-3 mb-5">
                    <span className="text-3xl font-bold text-ink-base">{price.value}</span>
                    <span className="text-ink-muted text-sm">{price.suffix}</span>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {featureList(plan.features).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-ink-muted">
                        <Check size={16} className="text-status-success flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <Button variant="primary" fullWidth disabled title="Checkout em breve">
                      Assinar (em breve)
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-ink-faint mt-8">
          O pagamento será habilitado quando o gateway estiver integrado.
        </p>
      </div>
    </div>
  );
}
