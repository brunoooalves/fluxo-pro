import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, TrendingUp, DollarSign, Percent, Table, BarChart3, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Breadcrumb, Button, Card } from './ui';
import { INCC_DATA, getInccMonthlyAverage, getInccAnnualized, INCC_OUTLIER_YEAR } from '../data/inccData';

// Anos da série do INCC, derivados dos dados (sem hardcode).
const ANOS_INCC = Object.keys(INCC_DATA).map(Number).sort((a, b) => a - b);
const ANOS_INCC_COMPLETOS = ANOS_INCC.filter(y => INCC_DATA[y].every(v => v !== null));

export default function INCCResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = location.pathname.startsWith('/test/') ? '/test/calculadora' : '/calculadora';
  const { opcao, valorImovel, resultados, calculatorInputs } = location.state || {};

  const [selectedInccYear, setSelectedInccYear] = useState('media');
  const [simulacaoINCC, setSimulacaoINCC] = useState(null);
  const [showHistoricalTable, setShowHistoricalTable] = useState(false);
  const [showPaymentTable, setShowPaymentTable] = useState(false);
  const contentRef = useRef(null);

  const dadosINCC = INCC_DATA;

  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const calcularAcumuladoAnual = (ano) => {
    const dados = dadosINCC[ano];
    if (!dados) return 0;
    const dadosValidos = dados.filter(v => v !== null);
    return dadosValidos.reduce((acc, val) => acc * (1 + val / 100), 1) - 1;
  };

  const gerarSimulacaoINCC = (anoSelecionado) => {
    // Fonte única — mesma média mensal usada na calculadora (exclui 2021)
    const mediaINCC = getInccMonthlyAverage();
    const dataInicio = new Date();

    const simulacao = [];
    let totalPagoMensais = 0;
    let totalPagoIntercaladas = 0;
    let totalCorrecaoINCC = 0;
    let mesAtual = new Date(dataInicio);
    mesAtual.setMonth(mesAtual.getMonth() + 1);

    const mesesPorIntercalada = {
      'trimestral': 3,
      'semestral': 6,
      'anual': 12
    };

    const parcelaMensalBase = opcao.mensais.valorParcela;
    const parcelaIntercaladaBase = opcao.intercaladas ? opcao.intercaladas.valorParcela : 0;
    const totalMeses = opcao.mensais.quantidade;
    let fatorCorrecaoAcumulado = 1;

    for (let contadorMes = 1; contadorMes <= totalMeses; contadorMes++) {
      const ano = mesAtual.getFullYear();
      const mes = mesAtual.getMonth();

      let inccMes;
      if (anoSelecionado === 'media') {
        // Use actual INCC data if available, otherwise use average
        if (dadosINCC[ano] && dadosINCC[ano][mes] !== null && dadosINCC[ano][mes] !== undefined) {
          inccMes = dadosINCC[ano][mes];
        } else {
          inccMes = mediaINCC;
        }
      } else {
        // Use selected year's INCC data for the corresponding month
        const anoSelec = parseInt(anoSelecionado);
        if (dadosINCC[anoSelec] && dadosINCC[anoSelec][mes] !== null && dadosINCC[anoSelec][mes] !== undefined) {
          inccMes = dadosINCC[anoSelec][mes];
        } else {
          inccMes = mediaINCC;
        }
      }

      fatorCorrecaoAcumulado *= (1 + inccMes / 100);

      const parcelaMensalCorrigida = parcelaMensalBase * fatorCorrecaoAcumulado;
      const correcaoMensal = parcelaMensalCorrigida - parcelaMensalBase;

      let parcelaIntercaladaCorrigida = 0;
      let correcaoIntercalada = 0;
      if (opcao.intercaladas && contadorMes % mesesPorIntercalada[opcao.intercaladas.tipo] === 0) {
        parcelaIntercaladaCorrigida = parcelaIntercaladaBase * fatorCorrecaoAcumulado;
        correcaoIntercalada = parcelaIntercaladaCorrigida - parcelaIntercaladaBase;
      }

      totalPagoMensais += parcelaMensalCorrigida;
      totalPagoIntercaladas += parcelaIntercaladaCorrigida;
      totalCorrecaoINCC += correcaoMensal + correcaoIntercalada;

      simulacao.push({
        mes: contadorMes,
        data: `${mesesNomes[mes]}/${ano}`,
        incc: inccMes,
        inccProjetado: !(dadosINCC[ano] && dadosINCC[ano][mes] !== null && dadosINCC[ano][mes] !== undefined),
        fatorCorrecao: fatorCorrecaoAcumulado,
        parcelaMensalBase,
        parcelaMensalCorrigida,
        correcaoMensal,
        parcelaIntercaladaBase: parcelaIntercaladaCorrigida > 0 ? parcelaIntercaladaBase : 0,
        parcelaIntercaladaCorrigida,
        correcaoIntercalada,
        pagamentoTotal: parcelaMensalCorrigida + parcelaIntercaladaCorrigida,
        totalPagoAcumulado: opcao.entrada + totalPagoMensais + totalPagoIntercaladas
      });

      mesAtual.setMonth(mesAtual.getMonth() + 1);
    }

    const resumo = {
      entrada: opcao.entrada,
      totalMensaisSemCorrecao: opcao.mensais.total,
      totalMensaisComCorrecao: totalPagoMensais,
      totalIntercaladasSemCorrecao: opcao.intercaladas ? opcao.intercaladas.total : 0,
      totalIntercaladasComCorrecao: totalPagoIntercaladas,
      totalCorrecaoINCC,
      totalPagoSemCorrecao: opcao.entrada + opcao.mensais.total + (opcao.intercaladas ? opcao.intercaladas.total : 0),
      totalPagoComCorrecao: opcao.entrada + totalPagoMensais + totalPagoIntercaladas,
      financiamentoOriginal: opcao.financiamento,
      mediaINCC,
    };

    return { simulacao, resumo, opcao, anoSelecionado };
  };

  // Run simulation on mount and when year changes
  useEffect(() => {
    if (opcao && valorImovel) {
      const resultado = gerarSimulacaoINCC(selectedInccYear);
      setSimulacaoINCC(resultado);
    } else {
      navigate(basePath);
    }
  }, [selectedInccYear, opcao, valorImovel, navigate]);

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Calculate highest and lowest accumulated INCC values
  const getHighestLowestAccumulated = () => {
    const years = ANOS_INCC_COMPLETOS;
    const accumulated = years.map(ano => ({
      year: ano,
      value: calcularAcumuladoAnual(ano) * 100
    }));

    // Exclude the outlier year (ponto fora da curva) from highest/lowest.
    const semOutlier = accumulated.filter(item => item.year !== INCC_OUTLIER_YEAR);
    const highest = semOutlier.reduce((max, curr) => curr.value > max.value ? curr : max);
    const lowest = semOutlier.reduce((min, curr) => curr.value < min.value ? curr : min);
    // Média = mesma fonte usada no resto do app (INCC-M anualizado, exclui o outlier).
    const average = getInccAnnualized();

    return { highest, lowest, average };
  };

  // Generate comparison simulations for lowest, average, and highest scenarios
  const gerarComparacaoSimulacoes = () => {
    const { highest, lowest, average } = getHighestLowestAccumulated();

    const scenarios = [
      { name: 'Menor', year: lowest.year.toString(), color: 'green' },
      { name: 'Média', year: 'media', color: 'blue' },
      { name: 'Maior', year: highest.year.toString(), color: 'red' }
    ];

    return scenarios.map(scenario => {
      const sim = gerarSimulacaoINCC(scenario.year);
      return {
        name: scenario.name,
        year: scenario.year === 'media' ? 'Média' : scenario.year,
        color: scenario.color,
        totalPago: sim.resumo.totalPagoComCorrecao,
        totalCorrecao: sim.resumo.totalCorrecaoINCC,
        percentualAcumulado: scenario.year === 'media'
          ? average
          : (scenario.year === lowest.year.toString() ? lowest.value : highest.value)
      };
    });
  };

  // Show loading state while simulation is running or if no data
  if (!simulacaoINCC || !opcao || !valorImovel) {
    return (
      <div className="min-h-screen bg-surface-base py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
          <p className="text-ink-muted">Gerando simulação...</p>
        </div>
      </div>
    );
  }

  const { highest, lowest, average } = getHighestLowestAccumulated();

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Breadcrumb */}
        <div className="mb-2">
          <Breadcrumb items={[
            { label: 'Calculadora', href: '/calculadora' },
            { label: 'Resultados', href: '/calculadora/resultados' },
            { label: 'INCC' },
          ]} />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink-base tracking-tight flex items-center gap-3">
              <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-brand-500" />
              Simulação com INCC
            </h1>
            <p className="text-sm text-ink-faint mt-1">
              Projeção considerando correção pelo INCC-M (FGV)
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              icon={<ArrowLeft size={16} />}
              onClick={() => navigate(`${basePath}/resultados`, {
                state: { resultados, calculatorInputs }
              })}
            >
              Voltar
            </Button>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 sm:gap-3 mb-8">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">✓</span>
            </div>
            <span className="text-sm text-ink-faint hidden sm:inline">Dados</span>
          </div>
          <div className="w-8 sm:w-12 h-0.5 bg-brand-500" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">✓</span>
            </div>
            <span className="text-sm text-ink-faint hidden sm:inline">Resultados</span>
          </div>
          <div className="w-8 sm:w-12 h-0.5 bg-brand-500" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">3</span>
            </div>
            <span className="text-sm font-semibold text-ink-base">INCC</span>
          </div>
        </div>

        <div ref={contentRef}>
        <div className="space-y-6">
          {/* Historical INCC Table - Collapsible */}
          <Card variant="outlined" padding="none" className="overflow-hidden">
            <button
              onClick={() => setShowHistoricalTable(!showHistoricalTable)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Table size={20} className="text-brand-500" />
                <div>
                  <h3 className="text-base font-semibold text-ink-base">
                    Histórico do INCC-M ({ANOS_INCC[0]}-{ANOS_INCC[ANOS_INCC.length - 1]})
                  </h3>
                  <p className="text-sm text-ink-faint">Clique para {showHistoricalTable ? 'ocultar' : 'mostrar'} detalhes</p>
                </div>
              </div>
              {showHistoricalTable ? (
                <ChevronUp size={20} className="text-ink-faint" />
              ) : (
                <ChevronDown size={20} className="text-ink-faint" />
              )}
            </button>

            {showHistoricalTable && (
              <div className="px-4 pb-4 border-t border-surface-border">
                <div className="overflow-x-auto mt-4 -mx-4 px-4">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="bg-surface-muted">
                        <th className="px-2 py-2 text-left font-semibold text-ink-base text-xs">Ano</th>
                        {mesesNomes.map(mes => (
                          <th key={mes} className="px-1.5 py-2 text-center font-semibold text-ink-base text-xs">{mes}</th>
                        ))}
                        <th className="px-2 py-2 text-center font-bold text-ink-base text-xs bg-surface-border/30">Acum.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ANOS_INCC.map(ano => {
                        const acumulado = calcularAcumuladoAnual(ano) * 100;
                        const isPontoForaDaCurva = ano === INCC_OUTLIER_YEAR;
                        const anoCompleto = INCC_DATA[ano].every(v => v !== null);
                        const isHighest = anoCompleto && !isPontoForaDaCurva && acumulado === highest.value;
                        const isLowest = anoCompleto && !isPontoForaDaCurva && acumulado === lowest.value;

                        let rowClass = 'border-b border-surface-border';
                        let textClass = 'text-ink-base';

                        if (isPontoForaDaCurva) {
                          rowClass += ' bg-yellow-50';
                          textClass = 'text-yellow-800';
                        } else if (isLowest) {
                          rowClass += ' bg-green-50';
                          textClass = 'text-green-800';
                        } else if (isHighest) {
                          rowClass += ' bg-red-50';
                          textClass = 'text-red-800';
                        }

                        return (
                          <tr key={ano} className={rowClass}>
                            <td className={`px-2 py-1.5 font-semibold text-xs ${textClass}`}>{ano}</td>
                            {dadosINCC[ano].map((valor, idx) => (
                              <td key={idx} className={`px-1.5 py-1.5 text-center text-xs ${valor === null ? 'text-ink-faint' : textClass}`}>
                                {valor !== null ? `${valor.toFixed(2)}%` : '-'}
                              </td>
                            ))}
                            <td className={`px-2 py-1.5 text-center font-bold text-xs ${textClass}`}>
                              {acumulado.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Nota:</strong> O ano de {INCC_OUTLIER_YEAR} (destacado em amarelo) é considerado um ponto fora da curva e foi excluído dos cálculos de média e maior acumulado.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Summary Cards - Always Visible */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <Card variant="outlined" padding="md" className="ring-1 ring-green-200 bg-green-50/30">
              <p className="text-xs sm:text-sm text-green-700 font-medium mb-1">Menor ({lowest.year})</p>
              <p className="text-lg sm:text-2xl font-bold text-green-800">{lowest.value.toFixed(1)}%</p>
            </Card>
            <Card variant="outlined" padding="md" className="ring-1 ring-blue-200 bg-blue-50/30">
              <p className="text-xs sm:text-sm text-blue-700 font-medium mb-1">Média</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-800">{average.toFixed(1)}%</p>
            </Card>
            <Card variant="outlined" padding="md" className="ring-1 ring-red-200 bg-red-50/30">
              <p className="text-xs sm:text-sm text-red-700 font-medium mb-1">Maior ({highest.year})</p>
              <p className="text-lg sm:text-2xl font-bold text-red-800">{highest.value.toFixed(1)}%</p>
            </Card>
          </div>

          {/* INCC Year Selector */}
          <Card variant="outlined" padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BarChart3 size={20} className="text-amber-500 flex-shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-ink-base">Índice INCC para Simulação</h3>
                  <p className="text-sm text-ink-faint">Selecione qual índice usar</p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <select
                  value={selectedInccYear}
                  onChange={(e) => setSelectedInccYear(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 bg-white text-ink-base font-medium transition-colors"
                >
                  <option value="media">
                    Média Histórica ({ANOS_INCC_COMPLETOS[0]}-{ANOS_INCC_COMPLETOS[ANOS_INCC_COMPLETOS.length - 1]})
                  </option>
                  {ANOS_INCC_COMPLETOS.map(ano => (
                    <option key={ano} value={ano.toString()}>
                      INCC de {ano} ({(calcularAcumuladoAnual(ano) * 100).toFixed(2)}% acum.)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
              <p className="text-sm text-amber-800">
                {selectedInccYear === 'media'
                  ? 'A projeção utiliza dados reais quando disponíveis e média histórica para meses futuros.'
                  : `A projeção repete o padrão mensal do INCC de ${selectedInccYear} para todos os meses da simulação.`}
              </p>
            </div>

            {/* Comparison Table */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-ink-base mb-3">Comparação de Cenários</h4>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="bg-surface-muted">
                      <th className="px-3 py-2.5 text-left font-semibold text-ink-base text-xs">Cenário</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-ink-base text-xs">Ano</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-ink-base text-xs">INCC Acum.</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-ink-base text-xs">Correção</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-ink-base text-xs">Total Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gerarComparacaoSimulacoes().map((cenario, idx) => {
                      const bgColor = cenario.color === 'green' ? 'bg-green-50' :
                                     cenario.color === 'blue' ? 'bg-blue-50' : 'bg-red-50';
                      const textColor = cenario.color === 'green' ? 'text-green-800' :
                                       cenario.color === 'blue' ? 'text-blue-800' : 'text-red-800';

                      return (
                        <tr key={idx} className={`border-b border-surface-border ${bgColor}`}>
                          <td className={`px-3 py-2.5 font-semibold text-xs sm:text-sm ${textColor}`}>{cenario.name}</td>
                          <td className={`px-3 py-2.5 text-center text-xs sm:text-sm ${textColor}`}>{cenario.year}</td>
                          <td className={`px-3 py-2.5 text-center font-medium text-xs sm:text-sm ${textColor}`}>
                            {cenario.percentualAcumulado.toFixed(1)}%
                          </td>
                          <td className={`px-3 py-2.5 text-right font-medium text-xs sm:text-sm ${textColor}`}>
                            {formatarMoeda(cenario.totalCorrecao)}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-bold text-xs sm:text-sm ${textColor}`}>
                            {formatarMoeda(cenario.totalPago)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card variant="outlined" padding="md" className="ring-1 ring-emerald-200 bg-emerald-50/30">
              <div className="flex items-center gap-2 mb-1.5">
                <DollarSign size={16} className="text-emerald-600" />
                <h3 className="text-xs font-semibold text-ink-muted">Entrada</h3>
              </div>
              <p className="text-sm sm:text-lg font-bold text-emerald-700">{formatarMoeda(simulacaoINCC.resumo.entrada)}</p>
            </Card>

            <Card variant="outlined" padding="md" className="ring-1 ring-blue-200 bg-blue-50/30">
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingUp size={16} className="text-blue-600" />
                <h3 className="text-xs font-semibold text-ink-muted">Total Mensais</h3>
              </div>
              <p className="text-xs text-ink-faint line-through">{formatarMoeda(simulacaoINCC.resumo.totalMensaisSemCorrecao)}</p>
              <p className="text-sm sm:text-lg font-bold text-blue-700">{formatarMoeda(simulacaoINCC.resumo.totalMensaisComCorrecao)}</p>
            </Card>

            <Card variant="outlined" padding="md" className="ring-1 ring-amber-200 bg-amber-50/30">
              <div className="flex items-center gap-2 mb-1.5">
                <Calendar size={16} className="text-amber-600" />
                <h3 className="text-xs font-semibold text-ink-muted">Total Intercaladas</h3>
              </div>
              <p className="text-xs text-ink-faint line-through">{formatarMoeda(simulacaoINCC.resumo.totalIntercaladasSemCorrecao)}</p>
              <p className="text-sm sm:text-lg font-bold text-amber-700">{formatarMoeda(simulacaoINCC.resumo.totalIntercaladasComCorrecao)}</p>
            </Card>

            <Card variant="outlined" padding="md" className="ring-1 ring-red-200 bg-red-50/30">
              <div className="flex items-center gap-2 mb-1.5">
                <Percent size={16} className="text-red-600" />
                <h3 className="text-xs font-semibold text-ink-muted">Correção INCC</h3>
              </div>
              <p className="text-sm sm:text-lg font-bold text-red-700">+{formatarMoeda(simulacaoINCC.resumo.totalCorrecaoINCC)}</p>
            </Card>
          </div>

          <Card variant="outlined" padding="none" className="overflow-hidden">
            <button
              onClick={() => setShowPaymentTable(!showPaymentTable)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-amber-500" />
                <div>
                  <h3 className="text-base font-semibold text-ink-base">Tabela de Pagamentos Mês a Mês</h3>
                  <p className="text-sm text-ink-faint">Clique para {showPaymentTable ? 'ocultar' : 'mostrar'} detalhes</p>
                </div>
              </div>
              {showPaymentTable ? (
                <ChevronUp size={20} className="text-ink-faint" />
              ) : (
                <ChevronDown size={20} className="text-ink-faint" />
              )}
            </button>

            {showPaymentTable && (
            <div className="px-4 pb-4 border-t border-surface-border">
            <div className="overflow-x-auto -mx-4 sm:mx-0 max-h-96 mt-4">
              <table className="w-full text-sm min-w-[650px]">
                <thead className="sticky top-0 bg-surface-muted z-10">
                  <tr>
                    <th className="px-2 sm:px-3 py-2.5 text-left font-semibold text-ink-base text-xs">#</th>
                    <th className="px-2 sm:px-3 py-2.5 text-left font-semibold text-ink-base text-xs">Mês/Ano</th>
                    <th className="px-2 sm:px-3 py-2.5 text-center font-semibold text-ink-base text-xs">INCC</th>
                    <th className="px-2 sm:px-3 py-2.5 text-center font-semibold text-ink-base text-xs">Fator</th>
                    <th className="px-2 sm:px-3 py-2.5 text-right font-semibold text-ink-base text-xs">Mensal</th>
                    <th className="px-2 sm:px-3 py-2.5 text-right font-semibold text-ink-base text-xs">Intercalada</th>
                    <th className="px-2 sm:px-3 py-2.5 text-right font-semibold text-ink-base text-xs bg-brand-50">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {simulacaoINCC.simulacao.map((linha, idx) => (
                    <tr key={idx} className={`border-b border-surface-border hover:bg-surface-muted/50 ${linha.parcelaIntercaladaCorrigida > 0 ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-2 sm:px-3 py-1.5 text-ink-faint text-xs">{linha.mes}</td>
                      <td className="px-2 sm:px-3 py-1.5 font-medium text-ink-base text-xs">{linha.data}</td>
                      <td className="px-2 sm:px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${linha.inccProjetado ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {linha.incc.toFixed(2)}%
                          {linha.inccProjetado && ' *'}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 text-center text-purple-600 font-medium text-xs">{linha.fatorCorrecao.toFixed(4)}</td>
                      <td className="px-2 sm:px-3 py-1.5 text-right text-ink-muted text-xs">{formatarMoeda(linha.parcelaMensalCorrigida)}</td>
                      <td className="px-2 sm:px-3 py-1.5 text-right font-medium text-amber-600 text-xs">
                        {linha.parcelaIntercaladaCorrigida > 0 ? formatarMoeda(linha.parcelaIntercaladaCorrigida) : '-'}
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 text-right font-bold text-brand-700 bg-brand-50/50 text-xs">{formatarMoeda(linha.pagamentoTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-muted font-bold sticky bottom-0">
                  <tr>
                    <td colSpan={4} className="px-2 sm:px-3 py-2.5 text-right text-xs text-ink-base">TOTAIS:</td>
                    <td className="px-2 sm:px-3 py-2.5 text-right text-ink-base text-xs">{formatarMoeda(simulacaoINCC.resumo.totalMensaisComCorrecao)}</td>
                    <td className="px-2 sm:px-3 py-2.5 text-right text-amber-700 text-xs">{formatarMoeda(simulacaoINCC.resumo.totalIntercaladasComCorrecao)}</td>
                    <td className="px-2 sm:px-3 py-2.5 text-right text-brand-700 bg-brand-50 text-xs">
                      {formatarMoeda(simulacaoINCC.resumo.totalMensaisComCorrecao + simulacaoINCC.resumo.totalIntercaladasComCorrecao)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-ink-faint">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-100 rounded"></span>
                <span>INCC Real</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 bg-yellow-100 rounded"></span>
                <span>INCC Projetado *</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 bg-amber-50 rounded"></span>
                <span>Mês com Intercalada</span>
              </div>
            </div>
            </div>
            )}
          </Card>

          <Card variant="outlined" padding="lg" className="bg-surface-muted/50">
            <h3 className="text-base font-semibold text-ink-base mb-4">Resumo Final da Simulação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-ink-faint">Total até Entrega (sem INCC)</p>
                <p className="text-lg sm:text-xl font-bold text-ink-base">{formatarMoeda(simulacaoINCC.resumo.totalPagoSemCorrecao)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-faint">Impacto do INCC</p>
                <p className="text-lg sm:text-xl font-bold text-amber-600">+{formatarMoeda(simulacaoINCC.resumo.totalCorrecaoINCC)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-faint">Total até Entrega (com INCC)</p>
                <p className="text-lg sm:text-2xl font-bold text-brand-700">{formatarMoeda(simulacaoINCC.resumo.totalPagoSemCorrecao + simulacaoINCC.resumo.totalCorrecaoINCC)}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-surface-border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-ink-faint">Saldo (não corrigido)</p>
                  <p className="text-lg sm:text-xl font-bold text-ink-base">{formatarMoeda(simulacaoINCC.resumo.financiamentoOriginal)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-faint">Valor Total do Imóvel</p>
                  <p className="text-lg sm:text-xl font-bold text-ink-base">{formatarMoeda(parseFloat(valorImovel))}</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="p-3 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Atenção:</strong> Os valores com INCC projetado (*) são estimativas baseadas na média histórica do INCC-M ({simulacaoINCC.resumo.mediaINCC.toFixed(2)}% ao mês).
              Os valores reais podem variar conforme a inflação da construção civil.
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
