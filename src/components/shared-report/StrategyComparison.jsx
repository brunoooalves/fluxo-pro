import React from 'react';
import { Shield, Scale, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatarMoeda, generateProsCons } from './scenarioUtils';
import { STRATEGY } from './educationalCopy';

const STRATEGY_CONFIG = {
  conservative: { icon: Shield, color: 'blue', borderColor: 'border-blue-300', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
  balanced: { icon: Scale, color: 'emerald', borderColor: 'border-emerald-300', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700' },
  aggressive: { icon: Zap, color: 'amber', borderColor: 'border-amber-300', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  single: { icon: Shield, color: 'blue', borderColor: 'border-blue-300', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
};

function StrategyCard({ strategy, valorImovel, allStrategies }) {
  const config = STRATEGY_CONFIG[strategy.strategyType] || STRATEGY_CONFIG.single;
  const Icon = config.icon;
  const prosCons = generateProsCons(strategy, valorImovel, allStrategies);

  return (
    <div className={`bg-white rounded-2xl border-t-4 ${config.borderColor} shadow-sm border border-gray-100 overflow-hidden flex flex-col`}>
      <div className={`px-4 py-3 ${config.bgColor} flex items-center gap-2`}>
        <Icon size={18} className={config.textColor} />
        <h3 className={`text-sm font-bold ${config.textColor}`}>{prosCons.name}</h3>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Entrada</span>
            <span className="text-sm font-bold text-gray-900">
              {formatarMoeda(strategy.entrada)}
              {valorImovel > 0 && (
                <span className="text-xs font-normal text-gray-400 ml-1">
                  ({((strategy.entrada / valorImovel) * 100).toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Mensal</span>
            <span className="text-sm font-semibold text-gray-900">
              {strategy.mensais?.quantidade}x {formatarMoeda(strategy.mensais?.valorParcela)}
            </span>
          </div>
          {strategy.intercaladas && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Intercala</span>
              <span className="text-sm font-semibold text-gray-900">
                {strategy.intercaladas.quantidade}x {formatarMoeda(strategy.intercaladas.valorParcela)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">Saldo pós-chaves</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatarMoeda(strategy.financiamento)}
              {valorImovel > 0 && (
                <span className="text-xs font-normal text-gray-400 ml-1">
                  ({((strategy.financiamento / valorImovel) * 100).toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        </div>

        {prosCons.pros.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{STRATEGY.prosLabel}</p>
            <ul className="space-y-1.5">
              {prosCons.pros.map((pro, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-700 leading-relaxed">{pro}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {prosCons.cons.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{STRATEGY.consLabel}</p>
            <ul className="space-y-1.5">
              {prosCons.cons.map((con, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-700 leading-relaxed">{con}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 italic">
            <span className="font-semibold not-italic">{STRATEGY.idealLabel}</span>{' '}
            {prosCons.idealFor}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StrategyComparison({ strategies, valorImovel }) {
  if (!strategies || strategies.length === 0) return null;

  const gridCols = strategies.length === 1
    ? 'grid-cols-1 max-w-md mx-auto'
    : strategies.length === 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : 'grid-cols-1 sm:grid-cols-3';

  const isSingle = strategies.length === 1;
  const title = isSingle ? 'Seu plano de pagamento' : STRATEGY.sectionTitle;
  const subtitle = isSingle
    ? 'Cenário preparado pelo seu corretor com base no seu perfil.'
    : STRATEGY.sectionSubtitle;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        {valorImovel > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">Valor do imóvel</span>
            <span className="text-base font-bold text-gray-900">{formatarMoeda(valorImovel)}</span>
          </div>
        )}
      </div>
      <div className={`grid ${gridCols} gap-4`}>
        {strategies.map((strategy) => (
          <StrategyCard
            key={strategy.originalIndex}
            strategy={strategy}
            valorImovel={valorImovel}
            allStrategies={strategies}
          />
        ))}
      </div>
    </div>
  );
}
