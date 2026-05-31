import React from 'react';
import { X } from 'lucide-react';
import { getCityPriceHistory } from '../data/fipezapData';
import { formatPeriod } from '../data/fipezapAnalytics';
import { INCC_DATA, getInccMonthlyAverage, getInccAnnualized, INCC_OUTLIER_YEAR } from '../data/inccData';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const TITLES = {
  valorizacao: 'Como calculamos a Valorização',
  incc: 'Como calculamos a Correção INCC',
  ganhoReal: 'Como calculamos o Ganho Real',
};

function FormulaBox({ children }) {
  return (
    <div className="bg-surface-muted rounded-lg p-3 text-xs text-ink-muted space-y-1 mb-4">
      {children}
    </div>
  );
}

function inccAccumulated(rates) {
  let factor = 1;
  rates.forEach(v => { if (v !== null) factor *= (1 + v / 100); });
  return (factor - 1) * 100;
}

function ValorizacaoContent({ fipezapMatch }) {
  const history = getCityPriceHistory(fipezapMatch.cityName);
  const rows = history.map((h, i) => ({
    period: h.period,
    price: h.price,
    variation: i > 0 ? (h.price / history[i - 1].price - 1) * 100 : null,
  }));
  const variations = rows.filter(r => r.variation != null).map(r => r.variation);
  const avgMonthly = variations.length
    ? variations.reduce((a, b) => a + b, 0) / variations.length
    : 0;

  return (
    <>
      <p className="text-sm text-ink-muted mb-3">
        Fonte: <strong className="text-ink-base">FipeZap+</strong> — série mensal do preço médio
        por m² de {fipezapMatch.cityName}. A valorização é a <strong>média das variações
        mensais</strong> de toda a série, anualizada.
      </p>
      <FormulaBox>
        <p>1. Variação de cada mês = preço ÷ preço do mês anterior − 1</p>
        <p>2. Média mensal = média das {variations.length} variações mensais</p>
        <p>3. Valorização anual = (1 + média mensal)¹² − 1</p>
      </FormulaBox>

      <div className="overflow-y-auto max-h-72 border border-surface-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-muted">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-ink-base">Mês</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-ink-base">Preço/m²</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-ink-base">Variação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.period} className="border-t border-surface-border">
                <td className="px-3 py-1.5 text-xs text-ink-base">{formatPeriod(r.period)}</td>
                <td className="px-3 py-1.5 text-xs text-right text-ink-muted">
                  R$ {r.price.toLocaleString('pt-BR')}
                </td>
                <td className={`px-3 py-1.5 text-xs text-right font-medium ${
                  r.variation == null ? 'text-ink-faint'
                    : r.variation >= 0 ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {r.variation == null
                    ? '—'
                    : `${r.variation >= 0 ? '+' : ''}${r.variation.toFixed(2)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="bg-surface-muted rounded-lg px-4 py-3">
          <p className="text-xs text-ink-faint">Média mensal</p>
          <p className="text-lg font-bold text-ink-base">{avgMonthly.toFixed(3)}%</p>
        </div>
        <div className="bg-emerald-50 rounded-lg px-4 py-3">
          <p className="text-xs text-ink-faint">Valorização anualizada</p>
          <p className="text-lg font-bold text-emerald-700">
            {fipezapMatch.annualizedRate != null ? `+${fipezapMatch.annualizedRate.toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>
    </>
  );
}

function InccContent() {
  const years = Object.keys(INCC_DATA).map(Number).sort((a, b) => a - b);
  const media = getInccMonthlyAverage();
  const annual = getInccAnnualized();

  return (
    <>
      <p className="text-sm text-ink-muted mb-3">
        Fonte: <strong className="text-ink-base">INCC-M (FGV/IBRE)</strong> — Índice Nacional de
        Custo da Construção. A correção é a <strong>média das variações mensais</strong> do
        INCC-M, anualizada. O ano de {INCC_OUTLIER_YEAR} é <strong>excluído</strong> por ser um
        ponto fora da curva.
      </p>
      <FormulaBox>
        <p>1. Reúne as variações mensais do INCC-M (exceto {INCC_OUTLIER_YEAR})</p>
        <p>2. Média mensal = média aritmética dessas variações</p>
        <p>3. Correção anual = (1 + média mensal)¹² − 1</p>
      </FormulaBox>

      <div className="overflow-x-auto border border-surface-border rounded-lg">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-surface-muted">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-semibold text-ink-base">Ano</th>
              {MESES.map(m => (
                <th key={m} className="px-1.5 py-2 text-center text-xs font-semibold text-ink-base">{m}</th>
              ))}
              <th className="px-2 py-2 text-center text-xs font-bold text-ink-base">Acum.</th>
            </tr>
          </thead>
          <tbody>
            {years.map(year => {
              const isOutlier = year === INCC_OUTLIER_YEAR;
              return (
                <tr key={year} className={`border-t border-surface-border ${isOutlier ? 'bg-amber-50' : ''}`}>
                  <td className={`px-2 py-1.5 text-xs font-semibold ${isOutlier ? 'text-amber-800' : 'text-ink-base'}`}>
                    {year}
                  </td>
                  {INCC_DATA[year].map((v, i) => (
                    <td key={i} className={`px-1.5 py-1.5 text-center text-xs ${
                      v == null ? 'text-ink-faint' : isOutlier ? 'text-amber-800' : 'text-ink-muted'
                    }`}>
                      {v == null ? '-' : v.toFixed(2)}
                    </td>
                  ))}
                  <td className={`px-2 py-1.5 text-center text-xs font-bold ${isOutlier ? 'text-amber-800' : 'text-ink-base'}`}>
                    {inccAccumulated(INCC_DATA[year]).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ink-faint mt-2">
        Linha em amarelo: {INCC_OUTLIER_YEAR}, excluído da média por ser ponto fora da curva.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="bg-surface-muted rounded-lg px-4 py-3">
          <p className="text-xs text-ink-faint">Média mensal</p>
          <p className="text-lg font-bold text-ink-base">{media.toFixed(3)}%</p>
        </div>
        <div className="bg-amber-50 rounded-lg px-4 py-3">
          <p className="text-xs text-ink-faint">Correção anualizada</p>
          <p className="text-lg font-bold text-amber-700">+{annual.toFixed(1)}%</p>
        </div>
      </div>
    </>
  );
}

function GanhoRealContent({ fipezapMatch }) {
  const valorizacao = fipezapMatch.annualizedRate;
  const incc = fipezapMatch.inccAnnualized;
  const ganho = fipezapMatch.realGain;

  return (
    <>
      <p className="text-sm text-ink-muted mb-3">
        O <strong className="text-ink-base">Ganho real</strong> mede quanto a valorização do
        imóvel supera a correção do INCC. É a diferença entre as duas taxas anuais.
      </p>
      <FormulaBox>
        <p>Ganho real = Valorização anual − Correção INCC anual</p>
      </FormulaBox>

      <div className="space-y-2">
        <div className="flex justify-between items-center px-4 py-2.5 bg-emerald-50 rounded-lg">
          <span className="text-sm text-ink-muted">Valorização (FipeZap+)</span>
          <span className="text-sm font-bold text-emerald-700">
            {valorizacao != null ? `+${valorizacao.toFixed(1)}%` : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center px-4 py-2.5 bg-amber-50 rounded-lg">
          <span className="text-sm text-ink-muted">− Correção INCC (INCC-M)</span>
          <span className="text-sm font-bold text-amber-700">
            {incc != null ? `+${incc.toFixed(1)}%` : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center px-4 py-3 bg-blue-50 rounded-lg border-t-2 border-blue-200">
          <span className="text-sm font-semibold text-ink-base">= Ganho real</span>
          <span className={`text-lg font-bold ${ganho != null && ganho < 0 ? 'text-red-600' : 'text-blue-700'}`}>
            {ganho != null ? `${ganho >= 0 ? '+' : ''}${ganho.toFixed(1)}%` : '—'}
          </span>
        </div>
      </div>

      {ganho != null && (
        <p className="text-xs text-ink-faint mt-3">
          {ganho >= 0
            ? 'Positivo: o imóvel valoriza acima do INCC — o patrimônio cresce em termos reais.'
            : 'Negativo: a valorização ficou abaixo do INCC no período analisado.'}
        </p>
      )}
    </>
  );
}

export default function MetricDetailModal({ metric, fipezapMatch, onClose }) {
  if (!metric || !fipezapMatch) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-surface-border sticky top-0 bg-surface-card z-10">
          <h2 className="text-lg font-bold text-ink-base">{TITLES[metric]}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-ink-faint hover:text-ink-base p-1"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5">
          {metric === 'valorizacao' && <ValorizacaoContent fipezapMatch={fipezapMatch} />}
          {metric === 'incc' && <InccContent />}
          {metric === 'ganhoReal' && <GanhoRealContent fipezapMatch={fipezapMatch} />}
        </div>
      </div>
    </div>
  );
}
