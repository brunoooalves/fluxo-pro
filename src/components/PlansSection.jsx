import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * Seção de planos reutilizável (landing e /assinar).
 *
 * Lê os planos ativos do Supabase (leitura pública via RLS). Sem Supabase
 * configurado, mostra planos de exemplo (fallback) com aviso de prévia.
 *
 * Props:
 *   - onSubscribe(plan): se fornecido, habilita o botão "Assinar".
 *                        Sem ele, o botão fica "Assinar (em breve)" desabilitado.
 */

const FEATURE_LABELS = {
  pdf: 'Exportação em PDF',
  compartilhamento: 'Link compartilhável',
  fipezap: 'Análise de valorização (FipeZap)',
  white_label: 'Relatórios sem marca',
};

// FALLBACK TEMPORÁRIO: planos fixos para preview sem Supabase configurado.
const FALLBACK_PLANS = [
  { id: 'fb-basico', code: 'basico_mensal', name: 'Básico', price_cents: 2990, interval: 'month',
    features: { pdf: true, compartilhamento: true, max_imoveis: 5, simulacoes_mes: 50, fipezap: false, white_label: false } },
  { id: 'fb-pro', code: 'pro_mensal', name: 'Pro', price_cents: 3990, interval: 'month',
    features: { pdf: true, compartilhamento: true, max_imoveis: null, simulacoes_mes: null, fipezap: true, white_label: true } },
  { id: 'fb-pro-anual', code: 'pro_anual', name: 'Pro Anual', price_cents: 39900, interval: 'year',
    features: { pdf: true, compartilhamento: true, max_imoveis: null, simulacoes_mes: null, fipezap: true, white_label: true } },
];

function featureList(features = {}) {
  const items = [];
  for (const [key, label] of Object.entries(FEATURE_LABELS)) {
    if (features[key]) items.push(label);
  }
  items.push(features.max_imoveis == null ? 'Imóveis salvos ilimitados' : `Até ${features.max_imoveis} imóveis salvos`);
  items.push(features.simulacoes_mes == null ? 'Simulações ilimitadas' : `${features.simulacoes_mes} simulações/mês`);
  return items;
}

function formatPrice(cents, interval) {
  const value = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  return { value: `R$ ${value}`, suffix: interval === 'year' ? '/ano' : '/mês' };
}

export default function PlansSection({ onSubscribe }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setPlans(FALLBACK_PLANS);
      setUsingFallback(true);
      setLoading(false);
      return;
    }
    supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        const hasData = data && data.length > 0;
        setPlans(hasData ? data : FALLBACK_PLANS);
        setUsingFallback(!hasData);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p className="text-center text-ink-muted">Carregando planos...</p>;
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, i) => {
          const price = formatPrice(plan.price_cents, plan.interval);
          const highlighted = i === 1; // destaca o plano do meio
          return (
            <Card
              key={plan.id}
              variant="outlined"
              padding="lg"
              className={`flex flex-col ${highlighted ? 'ring-2 ring-brand-500 relative' : ''}`}
            >
              {highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                  Mais escolhido
                </span>
              )}
              <h3 className="text-lg font-semibold text-ink-base">{plan.name}</h3>
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
                <Button
                  variant={highlighted ? 'primary' : 'secondary'}
                  fullWidth
                  disabled={!onSubscribe}
                  title={onSubscribe ? undefined : 'Checkout em breve'}
                  onClick={() => onSubscribe?.(plan)}
                >
                  {onSubscribe ? 'Assinar' : 'Assinar (em breve)'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {usingFallback && (
        <p className="text-center mt-6">
          <span className="inline-block rounded-full bg-status-warning-bg px-3 py-1 text-xs text-status-warning-text">
            Prévia — planos de exemplo (Supabase ainda não conectado)
          </span>
        </p>
      )}
    </>
  );
}
