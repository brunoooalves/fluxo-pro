import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Building2, Phone, Loader2, Clock, AlertTriangle, WifiOff, RefreshCw } from 'lucide-react';
import { verifyShareId } from '../utils/shareUtils';
import { formatarMoeda, cleanPhone, parseDeliveryDate, classifyScenarios } from './shared-report/scenarioUtils';
import EducationalIntro from './shared-report/EducationalIntro';
import RecommendedHero from './shared-report/RecommendedHero';
import StrategyComparison from './shared-report/StrategyComparison';
import AllScenariosExpander from './shared-report/AllScenariosExpander';
import MarketAnalysisSection from './shared-report/MarketAnalysisSection';

const WHATSAPP_BASE_URL = 'https://wa.me/';

export default function SharedReport() {
  const location = useLocation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams(location.search);
    const shareId = params.get('s');

    if (!shareId) {
      setError('invalid');
      setLoading(false);
      return;
    }

    const result = await verifyShareId(shareId);
    if (result.data) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [location.search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const valorImovel = data?.valorImovel;
  const dataEntrega = data?.dataEntrega;
  const opcoes = data?.opcoes || [];
  const corretor = data?.corretor;
  const imovel = data?.imovel;
  const fipezap = data?.fipezap;
  const mesesAteEntrega = data?.mesesAteEntrega;

  const whatsappNumber = cleanPhone(corretor?.contato);
  const whatsappUrl = whatsappNumber ? `${WHATSAPP_BASE_URL}${whatsappNumber}` : '';

  const deliveryDate = useMemo(() => parseDeliveryDate(dataEntrega), [dataEntrega]);

  const { strategies, remaining } = useMemo(() => classifyScenarios(opcoes), [opcoes]);

  const midIndex = Math.floor(opcoes.length / 2);
  const recommendedScenario = opcoes.length >= 3 ? opcoes[midIndex] : null;

  const highlightIndices = useMemo(() => {
    const set = new Set();
    strategies.forEach(s => set.add(s.originalIndex));
    return set;
  }, [strategies]);

  const hasIntercaladas = useMemo(
    () => opcoes.some(o => o.intercaladas),
    [opcoes]
  );

  // Fonte única: usa a projeção já calculada pela calculadora (no payload),
  // em vez de recalcular — evita divergência por arredondamento da taxa.
  const investmentComparison = useMemo(() => {
    if (fipezap?.projectedValueAtDelivery == null) return null;
    const reProjected = fipezap.projectedValueAtDelivery;
    const reGain = fipezap.equityGain != null
      ? fipezap.equityGain
      : reProjected - valorImovel;
    return { reProjected, reGain };
  }, [fipezap, valorImovel]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 size={40} className="text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Carregando simulação...</p>
        </div>
      </div>
    );
  }

  if (error === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link expirado</h1>
          <p className="text-sm text-gray-500">Este link de simulação expirou. Solicite um novo link ao seu corretor.</p>
        </div>
      </div>
    );
  }

  if (error === 'network') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <WifiOff size={32} className="text-gray-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Erro de conexão</h1>
          <p className="text-sm text-gray-500 mb-4">Não foi possível verificar o link. Verifique sua conexão e tente novamente.</p>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            <RefreshCw size={16} />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (error || !data || !opcoes.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link inválido</h1>
          <p className="text-sm text-gray-500">Este link de simulação não pôde ser carregado. Solicite um novo link ao seu corretor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Building2 size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">
                {imovel?.nome || 'Simulação de Pagamento'}
              </h1>
              {imovel?.localizacao && (
                <p className="text-sm text-white/70 mt-0.5">{imovel.localizacao}</p>
              )}
              {(imovel?.cidade || imovel?.estado) && (
                <p className="text-sm text-white/70">
                  {[imovel.cidade, imovel.estado].filter(Boolean).join(' — ')}
                </p>
              )}
              <div className="flex flex-wrap gap-3 mt-3">
                <span className="text-sm bg-white/10 px-3 py-1 rounded-lg">
                  {formatarMoeda(valorImovel)}
                </span>
                {deliveryDate && (
                  <span className="text-sm bg-white/10 px-3 py-1 rounded-lg">
                    Entrega: {deliveryDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </span>
                )}
                {imovel?.metragem && (
                  <span className="text-sm bg-white/10 px-3 py-1 rounded-lg">
                    {imovel.metragem} m²
                  </span>
                )}
              </div>
              {corretor?.nome && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🧑‍💼</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{corretor.nome}</p>
                    {corretor.creci && (
                      <p className="text-xs text-white/60">CRECI {corretor.creci}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Section 2: Educational Intro */}
        <EducationalIntro hasIntercaladas={hasIntercaladas} />

        {/* Section 3: Recommended Scenario Hero */}
        {recommendedScenario && (
          <RecommendedHero scenario={recommendedScenario} valorImovel={valorImovel} />
        )}

        {/* Section 4: Strategy Comparison */}
        <StrategyComparison strategies={strategies} valorImovel={valorImovel} />

        {/* Section 5: All Scenarios Expander */}
        <AllScenariosExpander
          allScenarios={opcoes}
          highlightIndices={highlightIndices}
        />

        {/* Section 6: Market Analysis + INCC (merged) */}
        <MarketAnalysisSection
          fipezap={fipezap}
          valorImovel={valorImovel}
          mesesAteEntrega={mesesAteEntrega}
          investmentComparison={investmentComparison}
          opcoes={opcoes}
        />

        {/* General info */}
        {imovel?.informacoesGerais && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Informações Gerais</h2>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{imovel.informacoesGerais}</p>
            </div>
          </div>
        )}

        {/* Assinaturas — apenas em cenário único; vale como proposta quando assinada por ambos via Gov.br */}
        {opcoes.length === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Assinaturas</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Quando assinada por corretor e cliente via Gov.br, esta simulação vale como proposta.
              </p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="border-t border-gray-400 pt-2 mt-12">
                  <p className="text-sm font-medium text-gray-700">
                    {corretor?.nome
                      ? `Corretor — ${corretor.nome}${corretor.creci ? ` · CRECI ${corretor.creci}` : ''}`
                      : 'Corretor'}
                  </p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-400 pt-2 mt-12">
                  <p className="text-sm font-medium text-gray-700">Cliente</p>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Footer */}
        <div className="text-center py-6 pb-24">
          <p className="text-xs text-gray-400">
            Valores apresentados assim como disponibilidade podem sofrer alterações sem aviso prévio.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Simulação gerada em {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Floating WhatsApp CTA */}
      {whatsappUrl && corretor?.nome && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-white via-white/95 to-transparent">
          <div className="max-w-3xl mx-auto">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 active:scale-[0.98] transition-all text-base shadow-lg shadow-emerald-500/30"
            >
              <Phone size={20} />
              Falar com {corretor.nome.split(' ')[0]}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
