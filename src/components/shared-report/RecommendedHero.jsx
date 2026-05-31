import React from 'react';
import { Star } from 'lucide-react';
import { formatarMoeda } from './scenarioUtils';
import { HERO } from './educationalCopy';

export default function RecommendedHero({ scenario, valorImovel }) {
  if (!scenario) return null;

  const entradaPercent = valorImovel > 0
    ? ((scenario.entrada / valorImovel) * 100).toFixed(0)
    : 0;

  const metrics = [
    {
      label: HERO.metricsLabels.entrada,
      value: formatarMoeda(scenario.entrada),
      detail: `${entradaPercent}% do valor do imóvel`,
      highlight: false,
    },
    {
      label: HERO.metricsLabels.mensal,
      value: formatarMoeda(scenario.mensais?.valorParcela),
      detail: `${scenario.mensais?.quantidade}x durante a obra`,
      highlight: true,
    },
  ];

  if (scenario.intercaladas) {
    metrics.push({
      label: HERO.metricsLabels.intercaladas,
      value: formatarMoeda(scenario.intercaladas.valorParcela),
      detail: `${scenario.intercaladas.quantidade}x ${scenario.intercaladas.tipo}`,
      highlight: false,
    });
  }

  metrics.push({
    label: HERO.metricsLabels.financiamento,
    value: formatarMoeda(scenario.financiamento),
    detail: 'Saldo após receber as chaves',
    highlight: false,
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-emerald-200 overflow-hidden">
      <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-100">
        <div className="flex items-center gap-2 mb-2">
          <Star size={18} className="text-emerald-600 fill-emerald-600" />
          <span className="text-sm font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
            {HERO.badge}
          </span>
        </div>
        <p className="text-lg font-bold text-gray-900">{scenario.tipo}</p>
        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{HERO.explanation}</p>
      </div>

      <div className="p-5">
        <div className={`grid grid-cols-2 ${metrics.length > 2 ? 'sm:grid-cols-4' : 'sm:grid-cols-2'} gap-4`}>
          {metrics.map((m) => (
            <div key={m.label} className={`rounded-xl p-3 text-center ${m.highlight ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-gray-50'}`}>
              <p className="text-xs text-gray-500 mb-1">{m.label}</p>
              <p className={`text-lg font-bold ${m.highlight ? 'text-emerald-700' : 'text-gray-900'}`}>
                {m.value}
              </p>
              <p className="text-xs text-gray-500 mt-1">{m.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">Total até a entrega</span>
          <span className="text-lg font-bold text-gray-900">{formatarMoeda(scenario.total)}</span>
        </div>
      </div>
    </div>
  );
}
