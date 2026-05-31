import React, { useMemo } from 'react';
import { TrendingUp, BarChart3, Info, Landmark } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getInccMonthlyAverage } from '../../data/inccData';
import { formatarMoeda, formatPeriod } from './scenarioUtils';
import { MARKET, INCC_EDU } from './educationalCopy';

function EducationalCallout({ children, variant }) {
  const bg = variant === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100';
  const iconColor = variant === 'amber' ? 'text-amber-500' : 'text-blue-500';
  return (
    <div className={`flex items-start gap-2 ${bg} border rounded-lg px-3 py-2 mt-2`}>
      <Info size={14} className={`${iconColor} flex-shrink-0 mt-0.5`} />
      <p className="text-xs text-gray-600 leading-relaxed">{children}</p>
    </div>
  );
}

function InccSection({ opcoes }) {
  const firstOpcao = opcoes?.[0];
  if (!firstOpcao || !firstOpcao.mensais?.quantidade) return null;

  // Fonte única — mesma média mensal usada na calculadora (exclui 2021)
  const mediaINCC = getInccMonthlyAverage();

  const totalMeses = firstOpcao.mensais.quantidade;
  const parcelaMensalBase = firstOpcao.mensais.valorParcela;

  let fatorAcumulado = 1;
  let totalCorrecao = 0;
  let totalPago = 0;
  let parcelaFinal = parcelaMensalBase;

  for (let i = 0; i < totalMeses; i++) {
    fatorAcumulado *= (1 + mediaINCC / 100);
    const parcelaCorrigida = parcelaMensalBase * fatorAcumulado;
    totalCorrecao += parcelaCorrigida - parcelaMensalBase;
    totalPago += parcelaCorrigida;
    if (i === totalMeses - 1) parcelaFinal = parcelaCorrigida;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-amber-600" />
          <h2 className="text-lg font-bold text-gray-900">{INCC_EDU.title}</h2>
        </div>
        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{INCC_EDU.intro}</p>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <p className="text-xs text-amber-600 font-medium mb-1">Total INCC estimado</p>
            <p className="text-xl font-bold text-amber-700">{formatarMoeda(totalCorrecao)}</p>
            <p className="text-xs text-gray-500 mt-1">sobre {totalMeses} parcelas</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 font-medium mb-1">Total pago com INCC</p>
            <p className="text-xl font-bold text-gray-800">{formatarMoeda(totalPago)}</p>
            <p className="text-xs text-gray-500 mt-1">vs {formatarMoeda(parcelaMensalBase * totalMeses)} sem INCC</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 font-medium mb-1">INCC médio mensal</p>
            <p className="text-xl font-bold text-gray-800">{mediaINCC.toFixed(2)}%</p>
            <p className="text-xs text-gray-500 mt-1">média histórica</p>
          </div>
        </div>

        <EducationalCallout variant="amber">
          {INCC_EDU.naPratica(
            formatarMoeda(parcelaMensalBase),
            formatarMoeda(parcelaFinal),
            formatarMoeda(totalCorrecao),
            totalMeses
          )}
        </EducationalCallout>
      </div>
    </div>
  );
}

export default function MarketAnalysisSection({
  fipezap,
  valorImovel,
  mesesAteEntrega,
  investmentComparison,
  opcoes,
}) {
  const fzChartData = useMemo(() => {
    if (!fipezap?.priceHistory?.length) return [];
    return fipezap.priceHistory.map(h => ({
      period: formatPeriod(h.period),
      price: h.price,
    }));
  }, [fipezap]);

  const hasMarketData = !!fipezap;
  const hasInccData = opcoes?.[0]?.mensais?.quantidade > 0;

  if (!hasMarketData && !hasInccData) return null;

  return (
    <>
      {/* MARKET DATA FIRST - positive impact for the buyer */}
      {hasMarketData && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-600" />
                <h2 className="text-lg font-bold text-gray-900">{MARKET.sectionTitle}</h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{MARKET.sectionSubtitle}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {fipezap.neighborhood || fipezap.cityName} ({fipezap.state})
                {fipezap.periodRange && ` — ${formatPeriod(fipezap.periodRange.first)} a ${formatPeriod(fipezap.periodRange.last)}`}
              </p>
            </div>
            <div className="p-5 space-y-6">

              {/* 1. Valorização vs INCC - conditional, before projection for context */}
              {fipezap.annualizedRate != null && (
                <div className="bg-emerald-50 rounded-xl p-4 ring-1 ring-emerald-100">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Valorização da região</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white rounded-lg p-3 text-center ring-1 ring-emerald-200">
                      <p className="text-xs text-gray-500 mb-1">Média anual</p>
                      <p className="text-lg font-bold text-emerald-700">+{fipezap.annualizedRate.toFixed(1)}%</p>
                      <p className="text-xs text-gray-400">ao ano</p>
                    </div>
                    {fipezap.totalAppreciation != null && (
                      <div className="bg-white rounded-lg p-3 text-center ring-1 ring-emerald-200">
                        <p className="text-xs text-gray-500 mb-1">Acumulado</p>
                        <p className="text-lg font-bold text-emerald-700">+{fipezap.totalAppreciation.toFixed(1)}%</p>
                        <p className="text-xs text-gray-400">no período</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Imóveis em {fipezap.cityName} oferecem segurança patrimonial e possibilidade de renda com aluguel.
                  </p>
                </div>
              )}

              {/* 2. INVESTMENT PROJECTION */}
              {investmentComparison && (
                <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl p-5 ring-1 ring-emerald-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Landmark size={18} className="text-emerald-600" />
                    <p className="text-base font-bold text-gray-900">Projeção do seu patrimônio</p>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Baseada na valorização de +{fipezap.annualizedRate?.toFixed(1)}% a.a. da região, projetada para {mesesAteEntrega} meses
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/80 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-500 mb-1">Valor atual do imóvel</p>
                      <p className="text-lg font-bold text-gray-900">{formatarMoeda(valorImovel)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center ring-2 ring-emerald-300">
                      <p className="text-xs text-emerald-600 font-medium mb-1">Valor projetado na entrega</p>
                      <p className="text-xl font-bold text-emerald-700">{formatarMoeda(investmentComparison.reProjected)}</p>
                      <p className="text-sm text-emerald-600 font-semibold">+{formatarMoeda(investmentComparison.reGain)}</p>
                    </div>
                  </div>

                  <EducationalCallout>{MARKET.investmentCallout.projection}</EducationalCallout>
                </div>
              )}
            </div>
          </div>

          {/* Price evolution chart */}
          {fzChartData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <BarChart3 size={20} className="text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Evolução do Preço Médio (R$/m²)</h2>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {fipezap.cityName} — {fzChartData.length} meses de dados
                </p>
              </div>
              <div className="p-5">
                <div className="h-52 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={fzChartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={5} angle={-45} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Preço/m²']}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Line type="monotone" dataKey="price" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

        </>
      )}

      {/* INCC SECTION - after market data */}
      {hasInccData && <InccSection opcoes={opcoes} />}
    </>
  );
}
