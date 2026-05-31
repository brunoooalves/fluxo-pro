import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatarMoeda } from './scenarioUtils';
import { EXPANDER } from './educationalCopy';

export default function AllScenariosExpander({ allScenarios, highlightIndices }) {
  const [expanded, setExpanded] = useState(false);

  if (!allScenarios || allScenarios.length <= 3) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700">
          {expanded ? EXPANDER.hideAll : EXPANDER.showAll(allScenarios.length)}
        </span>
        {expanded ? (
          <ChevronUp size={18} className="text-gray-400" />
        ) : (
          <ChevronDown size={18} className="text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Cenário</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500">Entrada</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500">Mensal</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500 hidden sm:table-cell">Intercaladas</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500">Saldo pós-chaves</th>
              </tr>
            </thead>
            <tbody>
              {allScenarios.map((opcao, index) => {
                const isHighlighted = highlightIndices.has(index);
                return (
                  <tr
                    key={index}
                    className={`border-b border-gray-100 ${isHighlighted ? 'bg-blue-50/50 font-semibold' : ''}`}
                  >
                    <td className="py-2.5 px-4 text-gray-900">
                      {opcao.tipo}
                      {isHighlighted && (
                        <span className="ml-1.5 text-xs text-blue-600 font-normal">(destaque)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-900">{formatarMoeda(opcao.entrada)}</td>
                    <td className="py-2.5 px-4 text-right text-gray-900">
                      {opcao.mensais?.quantidade}x {formatarMoeda(opcao.mensais?.valorParcela)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-900 hidden sm:table-cell">
                      {opcao.intercaladas
                        ? `${opcao.intercaladas.quantidade}x ${formatarMoeda(opcao.intercaladas.valorParcela)}`
                        : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-900">{formatarMoeda(opcao.financiamento)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
