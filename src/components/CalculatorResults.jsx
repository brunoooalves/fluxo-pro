import React, { useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, TrendingUp, DollarSign, BarChart3, ArrowLeft, FileDown, Check, Building2, Minus, Plus, ChevronUp, Save, Trash2, Pin, Search, Share2, Info, X, Copy } from 'lucide-react';
import { Breadcrumb, Button, Card, Modal } from './ui';
import jsPDF from 'jspdf';
import ShareMenu from './ShareMenu';
import MetricDetailModal from './MetricDetailModal';
import { salvarImovel, carregarImoveisSalvos, excluirImovel } from '../utils/imoveisSalvos';
import { getCityData, getLatestPeriod } from '../data/fipezapData';
import { classifyScenarios, generateProsCons } from './shared-report/scenarioUtils';

export default function CalculatorResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resultados: initialResultados, calculatorInputs } = location.state || {};

  const [resultados] = useState(initialResultados);
  const contentRef = useRef(null);

  // Modal state - inicializa com dados vindos da calculadora (se existirem)
  const [showModal, setShowModal] = useState(false);
  const reportInfoFromCalc = calculatorInputs?.reportInfo;

  // Corretor — carregado do localStorage se disponível
  const STORAGE_KEY_CORRETOR = 'fluxopro_corretor_salvo';
  // Feedback do botão "Salvar corretor" no modal de relatório
  const [corretorSalvo, setCorretorSalvo] = useState(false);
  // Filtro de perfil — recolhido por padrão (o corretor já pode ajustar
  // cada cenário em +/-, tornando este filtro redundante no fluxo principal).
  const [filtroPerfilAberto, setFiltroPerfilAberto] = useState(false);
  // Modal de detalhes de cálculo dos índices (valorizacao | incc | ganhoReal)
  const [metricDetail, setMetricDetail] = useState(null);
  const [showBairros, setShowBairros] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [incluirAnaliseMercado, setIncluirAnaliseMercado] = useState(true);

  // Monta o texto do cenário para o corretor copiar (ex.: colar no WhatsApp)
  const buildScenarioText = (opcao, perc) => {
    const sep = '━━━━━━━━━━━━━━━━━━━━';
    const imv = reportInfo?.imovel;

    const head = [];
    if (imv?.nome) head.push(`*${imv.nome}*`);
    const local = [imv?.cidade, imv?.estado].filter(Boolean).join(' - ');
    if (local) head.push(`📍 ${local}`);
    head.push(`💰 Valor do imóvel: ${formatarMoeda(parseFloat(calculatorInputs?.valorImovel) || 0)}`);

    const plano = [`*Plano: ${perc}% de entrada*`, `• Entrada: ${formatarMoeda(opcao.entrada)}`];
    if (opcao.mensais?.total > 0) {
      plano.push(`• Mensais (${opcao.mensais.quantidade}x): ${formatarMoeda(opcao.mensais.valorParcela)}`);
    }
    if (opcao.intercaladas?.total > 0) {
      const tipo = opcao.intercaladas.tipo.charAt(0).toUpperCase() + opcao.intercaladas.tipo.slice(1);
      plano.push(`• ${tipo} (${opcao.intercaladas.quantidade}x): ${formatarMoeda(opcao.intercaladas.valorParcela)}`);
    }
    plano.push(`• Saldo pós-chaves: ${formatarMoeda(opcao.financiamento)}`);

    return [sep, ...head, sep, ...plano, sep].join('\n');
  };

  const copyScenario = (opcao, perc, index) => {
    const text = buildScenarioText(opcao, perc);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => { setCopiedIdx(index); setTimeout(() => setCopiedIdx(null), 2000); })
        .catch(() => {});
    }
  };
  // Feedback do botão "Salvar empreendimento" no modal de relatório
  const [imovelSalvo, setImovelSalvo] = useState(false);
  // Empreendimentos salvos no dispositivo — seletor no modal de relatório
  const [imoveisSalvos, setImoveisSalvos] = useState(() => carregarImoveisSalvos());
  const [imovelSelecionadoId, setImovelSelecionadoId] = useState(null);

  const [reportInfo, setReportInfo] = useState(() => {
    const corretorSalvo = (() => {
      try {
        const saved = localStorage.getItem('fluxopro_corretor_salvo');
        return saved ? JSON.parse(saved) : null;
      } catch { return null; }
    })();
    const base = reportInfoFromCalc || {
      corretor: { nome: '', creci: '', contato: '' },
      imovel: { nome: '', localizacao: '', unidade: '', metragem: '', cidade: '', estado: '', informacoesGerais: '' },
      cliente: { nome: '', cpf: '' }
    };
    return {
      ...base,
      corretor: corretorSalvo || base.corretor || { nome: '', creci: '', contato: '' },
      cliente: base.cliente || { nome: '', cpf: '' }
    };
  });

  const salvarCorretorAtual = () => {
    if (!reportInfo.corretor.nome) return;
    try {
      localStorage.setItem(STORAGE_KEY_CORRETOR, JSON.stringify(reportInfo.corretor));
    } catch {
      return; // localStorage cheio ou indisponível
    }
    setCorretorSalvo(true);
    setTimeout(() => setCorretorSalvo(false), 2500);
  };

  const excluirCorretorSalvo = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_CORRETOR);
    } catch {
      // silencioso
    }
    setReportInfo(prev => ({
      ...prev,
      corretor: { nome: '', creci: '', contato: '' }
    }));
  };

  // PDF selection state — all selected by default
  const [selectedForPdf, setSelectedForPdf] = useState(() => {
    if (!initialResultados?.opcoes?.length) return {};
    return Object.fromEntries(initialResultados.opcoes.map((_, i) => [i, true]));
  });

  const selectedCount = Object.values(selectedForPdf).filter(Boolean).length;
  const totalCount = resultados?.opcoes?.length || 0;

  const toggleScenario = (index) => {
    setSelectedForPdf(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleAllScenarios = () => {
    if (!resultados?.opcoes?.length) return;
    const shouldSelectAll = selectedCount < resultados.opcoes.length;
    setSelectedForPdf(
      Object.fromEntries(resultados.opcoes.map((_, i) => [i, shouldSelectAll]))
    );
  };

  // Need-based filters
  const [filterEntrada, setFilterEntrada] = useState(null);
  const [filterMensal, setFilterMensal] = useState(null);
  const [filterSize, setFilterSize] = useState('all'); // 'baixas' | 'all' | 'altas'

  // Pinned scenarios for comparison modal
  const [pinnedIndices, setPinnedIndices] = useState(() => new Set());
  const [showCompareModal, setShowCompareModal] = useState(false);

  const togglePin = (index) => {
    setPinnedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const clearFilters = () => {
    setFilterEntrada(null);
    setFilterMensal(null);
    setFilterSize('all');
  };

  const hasActiveFilters = filterEntrada != null || filterMensal != null || filterSize !== 'all';

  // Customizable scenarios — deep clone from original
  const [customOpcoes, setCustomOpcoes] = useState(() => {
    if (!initialResultados?.opcoes?.length) return [];
    return initialResultados.opcoes.map(o => ({
      ...o,
      mensais: { ...o.mensais },
      intercaladas: o.intercaladas ? { ...o.intercaladas } : null
    }));
  });

  const valorImovelNum = parseFloat(calculatorInputs?.valorImovel || 0);
  const stepEntrada = valorImovelNum * 0.01;
  const stepMensal = 50;
  const stepIntercalada = 100;

  const adjustScenario = (index, field, direction) => {
    setCustomOpcoes(prev => {
      const opcoes = prev.map(o => ({
        ...o,
        mensais: { ...o.mensais },
        intercaladas: o.intercaladas ? { ...o.intercaladas } : null
      }));
      const opcao = opcoes[index];
      const budget = opcao.entrada + opcao.mensais.total + (opcao.intercaladas?.total || 0);

      if (field === 'entrada') {
        const newEntrada = Math.max(0, Math.min(budget, opcao.entrada + direction * stepEntrada));
        const remaining = budget - newEntrada;
        const oldNonEntrada = opcao.mensais.total + (opcao.intercaladas?.total || 0);

        if (opcao.intercaladas && oldNonEntrada > 0) {
          const ratioMensais = opcao.mensais.total / oldNonEntrada;
          const newMensaisTotal = remaining * ratioMensais;
          const newIntercTotal = remaining * (1 - ratioMensais);
          opcao.mensais.total = newMensaisTotal;
          opcao.mensais.valorParcela = opcao.mensais.quantidade > 0 ? newMensaisTotal / opcao.mensais.quantidade : 0;
          opcao.intercaladas.total = newIntercTotal;
          opcao.intercaladas.valorParcela = opcao.intercaladas.quantidade > 0 ? newIntercTotal / opcao.intercaladas.quantidade : 0;
        } else {
          opcao.mensais.total = remaining;
          opcao.mensais.valorParcela = opcao.mensais.quantidade > 0 ? remaining / opcao.mensais.quantidade : 0;
        }
        opcao.entrada = newEntrada;
      }

      if (field === 'mensais') {
        const newValor = Math.max(0, opcao.mensais.valorParcela + direction * stepMensal);
        const newTotal = newValor * opcao.mensais.quantidade;
        const newEntrada = opcao.entrada - (newTotal - opcao.mensais.total);
        if (newEntrada < 0 || newEntrada > budget) return prev;
        opcao.mensais.valorParcela = newValor;
        opcao.mensais.total = newTotal;
        opcao.entrada = newEntrada;
      }

      if (field === 'intercaladas' && opcao.intercaladas) {
        const newValor = Math.max(0, opcao.intercaladas.valorParcela + direction * stepIntercalada);
        const newTotal = newValor * opcao.intercaladas.quantidade;
        const newEntrada = opcao.entrada - (newTotal - opcao.intercaladas.total);
        if (newEntrada < 0 || newEntrada > budget) return prev;
        opcao.intercaladas.valorParcela = newValor;
        opcao.intercaladas.total = newTotal;
        opcao.entrada = newEntrada;
      }

      // Update percentage label
      const newPerc = valorImovelNum > 0 ? ((opcao.entrada / valorImovelNum) * 100) : 0;
      opcao.tipo = `${newPerc.toFixed(1).replace(/\.0$/, '')}% Entrada`;
      opcao.total = opcao.entrada + opcao.mensais.total + (opcao.intercaladas?.total || 0) + opcao.financiamento;

      return opcoes;
    });
  };

  // Filter ranges derived from current scenarios
  const entradaRange = useMemo(() => {
    if (!customOpcoes?.length) return { min: 0, max: 0 };
    const values = customOpcoes.map(o => o.entrada);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [customOpcoes]);

  const mensalRange = useMemo(() => {
    if (!customOpcoes?.length) return { min: 0, max: 0 };
    const values = customOpcoes.map(o => o.mensais?.valorParcela || 0);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [customOpcoes]);

  // Median entrada across all scenarios, used by the size-preference chip
  const entradaMedian = useMemo(() => {
    if (!customOpcoes?.length) return 0;
    const sorted = customOpcoes.map(o => o.entrada).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }, [customOpcoes]);

  // Apply filters to each scenario; track which filter killed it
  const scenarioMatches = useMemo(() => {
    return customOpcoes.map((o, index) => {
      const entradaOk = filterEntrada == null || o.entrada <= filterEntrada;
      const mensalOk = filterMensal == null || (o.mensais?.valorParcela || 0) <= filterMensal;
      const sizeOk =
        filterSize === 'all' ||
        (filterSize === 'baixas' && o.entrada <= entradaMedian) ||
        (filterSize === 'altas' && o.entrada >= entradaMedian);
      return { index, opcao: o, entradaOk, mensalOk, sizeOk, ok: entradaOk && mensalOk && sizeOk };
    });
  }, [customOpcoes, filterEntrada, filterMensal, filterSize, entradaMedian]);

  // Scenarios that pass filters, sorted ascending by entrada
  const filteredSorted = useMemo(() => {
    return scenarioMatches
      .filter(x => x.ok)
      .slice()
      .sort((a, b) => a.opcao.entrada - b.opcao.entrada);
  }, [scenarioMatches]);

  // Discarded scenarios with reason
  const discarded = useMemo(() => {
    const shortMoney = (v) => {
      if (v >= 1000) return `R$ ${(v / 1000).toFixed(1).replace('.', ',').replace(/,0$/, '')}k`;
      return `R$ ${Math.round(v)}`;
    };
    return scenarioMatches
      .filter(x => !x.ok)
      .map(x => {
        let reason;
        if (!x.entradaOk) reason = `entrada ${shortMoney(x.opcao.entrada)} acima do limite`;
        else if (!x.mensalOk) reason = `parcela ${shortMoney(x.opcao.mensais?.valorParcela || 0)} acima do limite`;
        else reason = filterSize === 'baixas' ? 'fora do grupo de entradas baixas' : 'fora do grupo de entradas altas';
        const perc = valorImovelNum > 0 ? ((x.opcao.entrada / valorImovelNum) * 100).toFixed(0) : '0';
        return { ...x, reason, perc };
      });
  }, [scenarioMatches, valorImovelNum, filterSize]);

  // Most restrictive filter when nothing fits (for conflict state)
  const mostRestrictive = useMemo(() => {
    if (filteredSorted.length > 0 || !hasActiveFilters) return null;
    const counts = { entrada: 0, mensal: 0, size: 0 };
    scenarioMatches.forEach(x => {
      if (!x.entradaOk) counts.entrada++;
      if (!x.mensalOk) counts.mensal++;
      if (!x.sizeOk) counts.size++;
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries[0][1] > 0 ? entries[0][0] : null;
  }, [filteredSorted, scenarioMatches, hasActiveFilters]);

  // Count how many scenarios would appear if the most restrictive filter is relaxed
  const autoRelaxCount = useMemo(() => {
    if (!mostRestrictive) return 0;
    return customOpcoes.filter(o => {
      const otherEntradaOk = mostRestrictive === 'entrada' || filterEntrada == null || o.entrada <= filterEntrada;
      const otherMensalOk = mostRestrictive === 'mensal' || filterMensal == null || (o.mensais?.valorParcela || 0) <= filterMensal;
      const otherSizeOk =
        mostRestrictive === 'size' ||
        filterSize === 'all' ||
        (filterSize === 'baixas' && o.entrada <= entradaMedian) ||
        (filterSize === 'altas' && o.entrada >= entradaMedian);
      return otherEntradaOk && otherMensalOk && otherSizeOk;
    }).length;
  }, [mostRestrictive, customOpcoes, filterEntrada, filterMensal, filterSize, entradaMedian]);

  const pinnedScenarios = useMemo(() => {
    return Array.from(pinnedIndices)
      .map(i => customOpcoes[i])
      .filter(Boolean);
  }, [pinnedIndices, customOpcoes]);

  const lupaMetrics = useMemo(() => {
    if (pinnedScenarios.length < 2) return null;
    const metrics = {
      entrada: pinnedScenarios.map(o => o.entrada),
      mensal: pinnedScenarios.map(o => o.mensais?.valorParcela || 0),
      intercalada: pinnedScenarios.map(o => o.intercaladas?.valorParcela || 0),
      saldo: pinnedScenarios.map(o => o.financiamento || 0),
      total: pinnedScenarios.map(o => o.total || 0),
    };
    const hasIntercaladas = metrics.intercalada.some(v => v > 0);
    return {
      entrada: { values: metrics.entrada, min: Math.min(...metrics.entrada), max: Math.max(...metrics.entrada) },
      mensal: { values: metrics.mensal, min: Math.min(...metrics.mensal), max: Math.max(...metrics.mensal) },
      ...(hasIntercaladas ? { intercalada: { values: metrics.intercalada, min: Math.min(...metrics.intercalada), max: Math.max(...metrics.intercalada) } } : {}),
      saldo: { values: metrics.saldo, min: Math.min(...metrics.saldo), max: Math.max(...metrics.saldo) },
      total: { values: metrics.total, min: Math.min(...metrics.total), max: Math.max(...metrics.total) },
    };
  }, [pinnedScenarios]);

  // Neighborhoods for share URL
  const shareNeighborhoods = useMemo(() => {
    const fz = calculatorInputs?.fipezapMatch;
    if (!fz?.cityName) return null;
    try {
      const data = getCityData(fz.cityName, getLatestPeriod());
      return data?.h || null;
    } catch {
      return null;
    }
  }, [calculatorInputs]);

  // If no data, redirect back
  if (!resultados || !calculatorInputs) {
    navigate('/calculadora');
    return null;
  }

  const handleInccButtonClick = (opcao) => {
    navigate('/calculadora/resultados/incc', {
      state: {
        opcao,
        valorImovel: calculatorInputs.valorImovel,
        resultados,
        calculatorInputs
      }
    });
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const handleExportClick = () => {
    // Sempre abre o modal para o corretor revisar os dados e preencher,
    // se desejar, unidade e dados do cliente (uso do relatório como proposta).
    setShowModal(true);
  };

  const handleModalSubmit = () => {
    if (!reportInfo.corretor.nome || !reportInfo.imovel.nome) {
      alert('Por favor, preencha os campos obrigatórios: Nome do Corretor e Nome do Empreendimento');
      return;
    }
    setShowModal(false);
    exportToPDF(reportInfo);
  };

  const handleInputChange = (section, field, value) => {
    setReportInfo(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const formatMetragem = (value) => {
    let cleaned = value.replace(/[^\d,.]/g, '');
    cleaned = cleaned.replace(',', '.');
    return cleaned;
  };

  // Formats a CPF progressively as 000.000.000-00 while typing
  const formatCpf = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  // Salva apenas os dados do empreendimento (reaproveitáveis) — não inclui
  // metragem/unidade do apartamento nem dados do cliente.
  const handleSalvarImovel = () => {
    const result = salvarImovel(reportInfo.imovel);
    if (result.ok) {
      setImoveisSalvos(carregarImoveisSalvos());
      if (result.imovel) setImovelSelecionadoId(result.imovel.id);
      setImovelSalvo(true);
      setTimeout(() => setImovelSalvo(false), 2500);
    }
  };

  const selecionarImovel = (id) => {
    const imovel = imoveisSalvos.find(item => item.id === id);
    if (!imovel) return;
    setImovelSelecionadoId(id);
    setReportInfo(prev => ({
      ...prev,
      imovel: {
        ...prev.imovel,
        nome: imovel.nome,
        localizacao: imovel.localizacao,
        cidade: imovel.cidade || '',
        estado: imovel.estado || '',
        informacoesGerais: imovel.informacoesGerais || ''
      }
    }));
  };

  const excluirImovelSalvo = (id) => {
    const novaLista = excluirImovel(id);
    setImoveisSalvos(novaLista);
    if (imovelSelecionadoId === id) {
      setImovelSelecionadoId(null);
      setReportInfo(prev => ({
        ...prev,
        imovel: { ...prev.imovel, nome: '', localizacao: '', cidade: '', estado: '', informacoesGerais: '' }
      }));
    }
  };


  const exportToPDF = async (info) => {
    // Filter only selected scenarios for PDF
    const selectedIndices = Object.entries(selectedForPdf)
      .filter(([, v]) => v)
      .map(([k]) => parseInt(k));
    const filteredOpcoes = selectedIndices.map(i => customOpcoes[i]);
    const pdfResultados = { ...resultados, opcoes: filteredOpcoes };

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const panelLeft = 15;
      const panelWidth = pageWidth - 30;
      const panelRight = panelLeft + panelWidth;
      let yPosition = 0;

      // ============ HEADER: Dark navy background ============
      pdf.setFillColor(30, 41, 59); // dark navy
      pdf.rect(0, 0, pageWidth, 34, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text('SIMULAÇÃO DE FLUXO DE PAGAMENTOS', panelLeft, 15);

      pdf.setFontSize(7.5);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(180, 190, 205);
      const now = new Date();
      const monthNamesLower = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                               'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const formattedDateFull = `${now.getDate()} de ${monthNamesLower[now.getMonth()]} de ${now.getFullYear()} às ${hours}:${minutes}`;
      pdf.text(`Relatório de análise financeira  |  Gerado em ${formattedDateFull}`, panelLeft, 23);

      // Orange separator line
      pdf.setFillColor(234, 160, 28);
      pdf.rect(panelLeft, 28, 40, 1.5, 'F');

      yPosition = 38;

      // ============ Helper: Section header with blue accent + gradient ============
      const drawSectionHeader = (title, y) => {
        const headerH = 7;
        const barW = panelWidth - 3;
        const steps = 20;
        const stepW = barW / steps;
        for (let i = 0; i < steps; i++) {
          const t = i / (steps - 1);
          const r = Math.round(55 + (38 - 55) * t);
          const g = Math.round(90 + (62 - 90) * t);
          const b = Math.round(145 + (110 - 145) * t);
          pdf.setFillColor(r, g, b);
          const x = panelLeft + 3 + i * stepW;
          const w = (i === steps - 1) ? (panelLeft + panelWidth - x) : stepW + 0.3;
          pdf.rect(x, y, w, headerH, 'F');
        }
        pdf.setFillColor(70, 130, 200);
        pdf.rect(panelLeft, y, 3, headerH, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.text(title, panelLeft + 7, y + 4.8);
        return y + headerH;
      };

      // ============ INFORMAÇÕES GERAIS ============
      yPosition = drawSectionHeader('INFORMAÇÕES GERAIS', yPosition);

      const valorImovel = parseFloat(calculatorInputs.valorImovel);

      const infoData = [];

      if (info.imovel.nome) {
        infoData.push({ label: 'Empreendimento:', value: info.imovel.nome });
      }
      if (info.imovel.localizacao) {
        infoData.push({ label: 'Endereço:', value: info.imovel.localizacao });
      }
      if (info.imovel.unidade) {
        infoData.push({ label: 'Unidade:', value: info.imovel.unidade });
      }
      if (info.imovel.cidade || info.imovel.estado) {
        const cidadeUf = [info.imovel.cidade, info.imovel.estado].filter(Boolean).join(', ');
        infoData.push({ label: 'Cidade/UF:', value: cidadeUf });
      }
      if (info.imovel.metragem) {
        infoData.push({ label: 'Metragem:', value: `${info.imovel.metragem} m²` });
        const metragem = parseFloat(info.imovel.metragem);
        if (metragem > 0) {
          const precoM2 = valorImovel / metragem;
          infoData.push({ label: 'Preço m²:', value: formatarMoeda(precoM2), isGreen: true });
        }
      }
      // Observações removido daqui - será renderizado separadamente abaixo
      if (info.corretor.nome) {
        infoData.push({ label: 'Corretor:', value: info.corretor.nome });
      }
      if (info.corretor.creci) {
        infoData.push({ label: 'CRECI-AL:', value: info.corretor.creci });
      }
      if (info.corretor.contato) {
        infoData.push({ label: 'Contato:', value: info.corretor.contato });
      }
      if (info.cliente?.nome) {
        infoData.push({ label: 'Cliente:', value: info.cliente.nome });
      }
      if (info.cliente?.cpf) {
        infoData.push({ label: 'CPF:', value: info.cliente.cpf });
      }

      const numRows = Math.ceil(infoData.length / 2);
      const infoRowHeight = 5;
      const infoTableHeight = numRows * infoRowHeight;
      const columnWidth = panelWidth / 2;
      const middleX = panelLeft + columnWidth;

      // Observações - calcular altura extra se existir
      const obsText = info.imovel.informacoesGerais
        ? info.imovel.informacoesGerais.substring(0, 256)
        : '';
      let obsLines = [];
      let obsExtraHeight = 0;
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      const obsLabelText = 'Observações:';
      const obsLabelWidth = pdf.getTextWidth(obsLabelText);
      const obsTextStartX = panelLeft + 3 + obsLabelWidth + 3;
      // Largura disponível = borda direita do painel - posição X do texto - margem direita
      const obsMaxWidth = panelRight - obsTextStartX - 3;
      if (obsText) {
        // Usar font bold para medir, pois é assim que será renderizado
        pdf.setFont(undefined, 'bold');
        const rawLines = pdf.splitTextToSize(obsText, obsMaxWidth);
        obsLines = [];
        rawLines.forEach(line => {
          if (pdf.getTextWidth(line) > obsMaxWidth) {
            let remaining = line;
            while (remaining.length > 0) {
              let cutIndex = remaining.length;
              while (cutIndex > 1 && pdf.getTextWidth(remaining.substring(0, cutIndex)) > obsMaxWidth) {
                cutIndex--;
              }
              obsLines.push(remaining.substring(0, cutIndex));
              remaining = remaining.substring(cutIndex);
            }
          } else {
            obsLines.push(line);
          }
        });
        pdf.setFont(undefined, 'normal');
        obsExtraHeight = 3 + obsLines.length * 3;
      }

      // Subtle background fill (no borders/lines)
      pdf.setFillColor(238, 242, 248);
      pdf.rect(panelLeft, yPosition, panelWidth, infoTableHeight + obsExtraHeight, 'F');

      pdf.setFontSize(8);
      const infoStartY = yPosition;
      infoData.forEach((row, index) => {
        const isLeft = index < numRows;
        const colX = isLeft ? panelLeft : middleX;
        const rowY = infoStartY + (isLeft ? index : (index - numRows)) * infoRowHeight;

        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.text(row.label, colX + 3, rowY + 3.5);

        pdf.setFont(undefined, 'bold');
        if (row.isGreen) {
          pdf.setTextColor(0, 150, 80);
        } else {
          pdf.setTextColor(0, 0, 0);
        }
        const labelW = pdf.getTextWidth(row.label);
        pdf.text(row.value, colX + 3 + labelW + 3, rowY + 3.5);
      });

      // Observações - renderizado por último, abaixo de todos os campos, com quebra de linha
      if (obsText) {
        const obsY = infoStartY + infoTableHeight + 1;
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.text(obsLabelText, panelLeft + 3, obsY + 2.5);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        let obsLineY = obsY + 2.5;
        obsLines.forEach((line) => {
          pdf.text(line, obsTextStartX, obsLineY);
          obsLineY += 3;
        });
      }

      yPosition += infoTableHeight + obsExtraHeight + 5;

      // ============ DADOS DA SIMULAÇÃO ============
      yPosition = drawSectionHeader('DADOS DA SIMULAÇÃO', yPosition);

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(8);

      const isCustom = resultados.tipoDistribuicao === 'customizado';
      const combosCustom = resultados.combinacoesCustom || calculatorInputs?.combinacoesCustom || [];
      const percEntrada = isCustom && combosCustom.length > 0
        ? (parseFloat(combosCustom[0].percEntrada) || 0)
        : (parseFloat(calculatorInputs.percEntrada) || 0);
      const percAteEntrega = isCustom && combosCustom.length > 0
        ? combosCustom.reduce((max, c) => {
            const s = (parseFloat(c.percEntrada) || 0) + (parseFloat(c.percParcelas) || 0) + (parseFloat(c.percIntercaladas) || 0);
            return s > max ? s : max;
          }, 0)
        : (parseFloat(calculatorInputs.percAteEntrega) || 0);
      const valorEntradaMinima = (valorImovel * percEntrada) / 100;

      const deliveryDate = new Date(calculatorInputs.dataEntrega + 'T00:00:00');
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const formattedDeliveryDate = `${monthNames[deliveryDate.getMonth()]} de ${deliveryDate.getFullYear()}`;

      let numIntercaladas = 0;
      if (isCustom) {
        const anyHasIntercaladas = combosCustom.some(c => (parseFloat(c.percIntercaladas) || 0) > 0);
        if (anyHasIntercaladas) {
          const meses = resultados.mesesAteEntrega;
          const tipo = calculatorInputs.tipoIntercaladaCustom;
          if (tipo === 'trimestral') numIntercaladas = Math.floor(meses / 3);
          else if (tipo === 'semestral') numIntercaladas = Math.floor(meses / 6);
          else if (tipo === 'anual') numIntercaladas = Math.floor(meses / 12);
        }
      } else if (calculatorInputs.temIntercaladas) {
        const meses = resultados.mesesAteEntrega;
        const tipo = calculatorInputs.tipoIntercalada;
        if (tipo === 'trimestral') numIntercaladas = Math.floor(meses / 3);
        else if (tipo === 'semestral') numIntercaladas = Math.floor(meses / 6);
        else if (tipo === 'anual') numIntercaladas = Math.floor(meses / 12);
      }

      if (pdfResultados.opcoes.length === 1) {
        // === SINGLE OPTION: Card-based layout ===
        const singleOption = pdfResultados.opcoes[0];
        const saldoValue = singleOption.financiamento || 0;
        const percSaldo = valorImovel > 0 ? ((saldoValue / valorImovel) * 100).toFixed(1) : '0.0';

        // Use customized entrada value from the selected option
        const customEntrada = singleOption.entrada;
        const customPercEntrada = valorImovel > 0 ? ((customEntrada / valorImovel) * 100) : 0;
        const customPagAteEntrega = customEntrada + (singleOption.mensais?.total || 0) + (singleOption.intercaladas?.total || 0);
        const customPercAteEntrega = valorImovel > 0 ? ((customPagAteEntrega / valorImovel) * 100) : 0;

        const cardGap = 3;
        const simCardW = (panelWidth - 2 * cardGap) / 3;
        const simCardH = 22;

        // Helper: draw a data card
        const drawDataCard = (x, y, w, h, title, mainValue, subtitle, mainColor) => {
          pdf.setFillColor(238, 242, 248);
          pdf.rect(x, y, w, h, 'F');
          pdf.setDrawColor(215, 220, 230);
          pdf.setLineWidth(0.2);
          pdf.rect(x, y, w, h);

          pdf.setFontSize(6);
          pdf.setFont(undefined, 'bold');
          pdf.setTextColor(100, 110, 125);
          pdf.text(title, x + 4, y + 5.5);

          pdf.setFont(undefined, 'bold');
          if (mainColor === 'green') pdf.setTextColor(0, 150, 80);
          else if (mainColor === 'yellow') pdf.setTextColor(200, 150, 0);
          else pdf.setTextColor(30, 41, 59);
          // Auto-size: use smaller font if value is too wide for card
          let valFontSize = 11;
          pdf.setFontSize(valFontSize);
          while (pdf.getTextWidth(mainValue) > w - 8 && valFontSize > 7) {
            valFontSize -= 0.5;
            pdf.setFontSize(valFontSize);
          }
          pdf.text(mainValue, x + 4, y + 13);

          pdf.setFontSize(6.5);
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(130, 135, 145);
          pdf.text(subtitle, x + 4, y + 18);
        };

        // Row 1: Data de Entrega | Valor do Imóvel | Pagamento até a Entrega
        yPosition += 3; // Extra spacing between section header and cards
        const row1Y = yPosition;
        const col1X = panelLeft;
        const col2X = panelLeft + simCardW + cardGap;
        const col3X = panelLeft + 2 * (simCardW + cardGap);

        drawDataCard(col1X, row1Y, simCardW, simCardH, 'DATA DE ENTREGA', formattedDeliveryDate, `Prazo total de ${resultados.mesesAteEntrega} meses`);
        drawDataCard(col2X, row1Y, simCardW, simCardH, 'VALOR DO IMÓVEL', formatarMoeda(valorImovel), '100% do total', 'green');
        drawDataCard(col3X, row1Y, simCardW, simCardH, 'PAGAMENTO ATÉ A ENTREGA', formatarMoeda(customPagAteEntrega), `${customPercAteEntrega.toFixed(1)}% do valor`, 'yellow');

        // Row 2: Entrada | Saldo Pós-Entrega | Metragem/Preço M²
        const row2Y = row1Y + simCardH + cardGap;

        drawDataCard(col1X, row2Y, simCardW, simCardH, 'ENTRADA', formatarMoeda(customEntrada), `${customPercEntrada.toFixed(1).replace(/\.0$/, '')}% do valor`);
        drawDataCard(col2X, row2Y, simCardW, simCardH, 'SALDO PÓS-ENTREGA', formatarMoeda(saldoValue), `${percSaldo}% do valor`, 'yellow');

        if (info.imovel.metragem && parseFloat(info.imovel.metragem) > 0) {
          const met = parseFloat(info.imovel.metragem);
          const pm2 = valorImovel / met;
          drawDataCard(col3X, row2Y, simCardW, simCardH, 'METRAGEM / PREÇO M²', `${met} m²  ·  ${formatarMoeda(pm2)}/m²`, 'Preço unitário calculado');
        }

        yPosition = row2Y + simCardH + 5; // 5mm gap before section

        // === DISTRIBUIÇÃO DO PAGAMENTO ===
        yPosition = drawSectionHeader('DISTRIBUIÇÃO DO PAGAMENTO', yPosition);

        const entradaAmt = customEntrada;
        const intercAmt = singleOption.intercaladas?.total || 0;
        const mensaisAmt = singleOption.mensais?.total || 0;

        const distSegments = [];
        if (entradaAmt > 0) distSegments.push({ label: 'Entrada', value: entradaAmt, perc: customPercEntrada.toFixed(1).replace(/\.0$/, ''), color: { r: 30, g: 41, b: 59 } });
        if (intercAmt > 0) {
          const pInterc = valorImovel > 0 ? ((intercAmt / valorImovel) * 100).toFixed(0) : '0';
          distSegments.push({ label: 'Intercaladas', value: intercAmt, perc: pInterc, color: { r: 55, g: 90, b: 145 } });
        }
        if (mensaisAmt > 0) {
          const pMensais = valorImovel > 0 ? ((mensaisAmt / valorImovel) * 100).toFixed(0) : '0';
          distSegments.push({ label: 'Mensais', value: mensaisAmt, perc: pMensais, color: { r: 100, g: 140, b: 190 } });
        }
        if (saldoValue > 0) distSegments.push({ label: 'Saldo', value: saldoValue, perc: percSaldo, color: { r: 180, g: 190, b: 200 } });

        const formatShortMoney = (v) => {
          if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1).replace('.', ',')}M`;
          if (v >= 1000) {
            const k = Math.round(v / 1000);
            const kStr = k.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return `R$ ${kStr}k`;
          }
          return formatarMoeda(v);
        };

        const barLabelH = 8;   // Top row: category labels
        const barValueH = 7;   // Bottom row: value subheaders
        const barTotalH = barLabelH + barValueH;
        const barY = yPosition + 1;
        const totalBar = distSegments.reduce((sum, s) => sum + s.value, 0);
        let bx = panelLeft;

        distSegments.forEach((seg, segIdx) => {
          const segW = totalBar > 0 ? (seg.value / totalBar) * panelWidth : 0;
          if (segW > 0) {
            // Top row: label
            pdf.setFillColor(seg.color.r, seg.color.g, seg.color.b);
            pdf.rect(bx, barY, segW, barLabelH, 'F');

            // Label text - auto-size font to fit
            pdf.setFont(undefined, 'bold');
            pdf.setFontSize(7);
            const txtColor = seg.color.r < 150 ? [255, 255, 255] : [30, 41, 59];
            pdf.setTextColor(txtColor[0], txtColor[1], txtColor[2]);
            let labelFontSize = 7;
            while (pdf.getTextWidth(seg.label) > segW - 4 && labelFontSize > 5) {
              labelFontSize -= 0.5;
              pdf.setFontSize(labelFontSize);
            }
            if (pdf.getTextWidth(seg.label) < segW - 2) {
              const tw = pdf.getTextWidth(seg.label);
              pdf.text(seg.label, bx + (segW - tw) / 2, barY + barLabelH / 2 + 1.5);
            }

            // Bottom row: value subheader (white background, black text)
            pdf.setFillColor(255, 255, 255);
            pdf.rect(bx, barY + barLabelH, segW, barValueH, 'F');

            // Value text - auto-size font to fit
            pdf.setFont(undefined, 'bold');
            pdf.setFontSize(7);
            pdf.setTextColor(30, 41, 59);
            const valueText = formatarMoeda(seg.value);
            let valFontSize = 7;
            while (pdf.getTextWidth(valueText) > segW - 4 && valFontSize > 5) {
              valFontSize -= 0.5;
              pdf.setFontSize(valFontSize);
            }
            if (pdf.getTextWidth(valueText) < segW - 2) {
              const vtw = pdf.getTextWidth(valueText);
              pdf.text(valueText, bx + (segW - vtw) / 2, barY + barLabelH + barValueH / 2 + 1.5);
            }

            // Borders between segments
            if (segIdx > 0) {
              // White vertical line in the colored header row
              pdf.setDrawColor(255, 255, 255);
              pdf.setLineWidth(0.4);
              pdf.line(bx, barY, bx, barY + barLabelH);
              // Gray vertical line in the white value row
              pdf.setDrawColor(215, 220, 230);
              pdf.setLineWidth(0.3);
              pdf.line(bx, barY + barLabelH, bx, barY + barTotalH);
            }
            // Horizontal border between label row and value row
            pdf.setDrawColor(215, 220, 230);
            pdf.setLineWidth(0.2);
            pdf.line(bx, barY + barLabelH, bx + segW, barY + barLabelH);

            bx += segW;
          }
        });

        // Outer border around the whole distribution bar
        pdf.setDrawColor(215, 220, 230);
        pdf.setLineWidth(0.3);
        pdf.rect(panelLeft, barY, panelWidth, barTotalH);

        // Legend below bar
        yPosition = barY + barTotalH + 3;
        let legendX = panelLeft;
        pdf.setFontSize(6);
        distSegments.forEach((seg) => {
          pdf.setFillColor(seg.color.r, seg.color.g, seg.color.b);
          pdf.rect(legendX, yPosition, 2.5, 2.5, 'F');
          legendX += 3.5;

          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(80, 80, 80);
          const legendText = `${seg.label} (${seg.perc}%)`;
          pdf.text(legendText, legendX, yPosition + 2);
          legendX += pdf.getTextWidth(legendText) + 5;
        });

        yPosition += 5; // 5mm gap before section (consistent spacing)

        // === PARCELAS DETALHADAS ===
        const hasInterc = singleOption.intercaladas && singleOption.intercaladas.total > 0;
        const hasMensais = singleOption.mensais && singleOption.mensais.total > 0;

        if (hasInterc || hasMensais) {
          yPosition = drawSectionHeader('PARCELAS DETALHADAS', yPosition);
          yPosition += 1;

          const parcGap = 3;
          const numParcCards = (hasInterc ? 1 : 0) + (hasMensais ? 1 : 0);
          const parcCardW = numParcCards === 2 ? (panelWidth - parcGap) / 2 : panelWidth;
          const parcCardH = 28;

          let parcX = panelLeft;

          if (hasInterc) {
            const interc = singleOption.intercaladas;
            const tipoPlural = { trimestral: 'TRIMESTRAIS', semestral: 'SEMESTRAIS', anual: 'ANUAIS' };
            const tipoLabel = tipoPlural[interc.tipo] || (interc.tipo || '').toUpperCase();

            pdf.setFillColor(238, 242, 248);
            pdf.rect(parcX, yPosition, parcCardW, parcCardH, 'F');
            pdf.setDrawColor(215, 220, 230);
            pdf.setLineWidth(0.2);
            pdf.rect(parcX, yPosition, parcCardW, parcCardH);

            pdf.setFontSize(7);
            pdf.setFont(undefined, 'bold');
            pdf.setTextColor(100, 110, 125);
            pdf.text(`INTERCALADAS ${tipoLabel}`, parcX + 4, yPosition + 5);

            pdf.setFontSize(7);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(130, 135, 145);
            pdf.text(`${interc.quantidade} parcelas`, parcX + 4, yPosition + 10);

            pdf.setFontSize(13);
            pdf.setFont(undefined, 'bold');
            pdf.setTextColor(30, 41, 59);
            pdf.text(formatarMoeda(interc.valorParcela), parcX + 4, yPosition + 18);

            pdf.setFontSize(6.5);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(130, 135, 145);
            pdf.text(`Total: ${formatarMoeda(interc.total)}`, parcX + 4, yPosition + 23);

            parcX += parcCardW + parcGap;
          }

          if (hasMensais) {
            const mens = singleOption.mensais;

            pdf.setFillColor(238, 242, 248);
            pdf.rect(parcX, yPosition, parcCardW, parcCardH, 'F');
            pdf.setDrawColor(215, 220, 230);
            pdf.setLineWidth(0.2);
            pdf.rect(parcX, yPosition, parcCardW, parcCardH);

            pdf.setFontSize(7);
            pdf.setFont(undefined, 'bold');
            pdf.setTextColor(100, 110, 125);
            pdf.text('MENSAIS', parcX + 4, yPosition + 5);

            pdf.setFontSize(7);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(130, 135, 145);
            pdf.text(`${mens.quantidade} parcelas`, parcX + 4, yPosition + 10);

            pdf.setFontSize(13);
            pdf.setFont(undefined, 'bold');
            pdf.setTextColor(30, 41, 59);
            pdf.text(formatarMoeda(mens.valorParcela), parcX + 4, yPosition + 18);

            pdf.setFontSize(6.5);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(130, 135, 145);
            pdf.text(`Total: ${formatarMoeda(mens.total)}  ·  Período de ${mens.quantidade} meses`, parcX + 4, yPosition + 23);
          }

          yPosition += parcCardH + 4;
        }

        pdf.setTextColor(0, 0, 0);

      } else {
        // === MULTI OPTION: Table-based layout ===
        // Recalculate summary from customized first option
        const multiFirstOption = pdfResultados.opcoes[0];
        const multiCustomEntrada = multiFirstOption ? multiFirstOption.entrada : valorEntradaMinima;
        const multiCustomPercEntrada = valorImovel > 0 ? ((multiCustomEntrada / valorImovel) * 100) : percEntrada;
        const multiCustomPagAteEntrega = multiFirstOption
          ? multiCustomEntrada + (multiFirstOption.mensais?.total || 0) + (multiFirstOption.intercaladas?.total || 0)
          : resultados.valorTotalAteEntrega;
        const multiCustomPercAteEntrega = valorImovel > 0 ? ((multiCustomPagAteEntrega / valorImovel) * 100) : percAteEntrega;

        const tableData = [];

        tableData.push({
          label: 'Data de Entrega:',
          value: `${formattedDeliveryDate} (${resultados.mesesAteEntrega} meses)`
        });

        tableData.push({
          label: 'Valor do Imóvel:',
          value: formatarMoeda(valorImovel),
          colorType: 'green',
          extraInfo: '(100%)'
        });

        tableData.push({
          label: 'Pagamento total até a entrega:',
          value: formatarMoeda(multiCustomPagAteEntrega),
          colorType: 'yellow',
          extraInfo: `(${multiCustomPercAteEntrega.toFixed(1)}%)`
        });

        tableData.push({
          label: isCustom ? 'Entrada:' : 'Entrada Mínima:',
          value: formatarMoeda(multiCustomEntrada),
          extraInfo: `(${multiCustomPercEntrada.toFixed(1).replace(/\.0$/, '')}%)`
        });

        if (isCustom) {
          if (combosCustom.length > 1) {
            const comboLabels = ['A', 'B', 'C'];
            combosCustom.forEach((combo, idx) => {
              const pE = parseFloat(combo.percEntrada) || 0;
              const pP = parseFloat(combo.percParcelas) || 0;
              const pI = parseFloat(combo.percIntercaladas) || 0;
              const saldo = 100 - pE - pP - pI;
              tableData.push({
                label: `Combinação ${comboLabels[idx]}:`,
                value: `${pE}% Entrada | ${pP}% Parcelas | ${pI}% Interc. | ${saldo.toFixed(1)}% Saldo`
              });
            });
          }

          const anyHasInterc = combosCustom.some(c => (parseFloat(c.percIntercaladas) || 0) > 0);
          if (anyHasInterc) {
            const tipoInt = calculatorInputs.tipoIntercaladaCustom.charAt(0).toUpperCase() + calculatorInputs.tipoIntercaladaCustom.slice(1);
            tableData.push({
              label: 'Intercaladas:',
              value: `${tipoInt} (${numIntercaladas}x)`
            });
          } else {
            tableData.push({
              label: 'Intercaladas:',
              value: 'Não possui parcelas intercaladas'
            });
          }
        } else if (calculatorInputs.temIntercaladas) {
          const tipoInt = calculatorInputs.tipoIntercalada.charAt(0).toUpperCase() + calculatorInputs.tipoIntercalada.slice(1);
          tableData.push({
            label: 'Intercaladas:',
            value: `${tipoInt} (${numIntercaladas}x)`
          });
        } else {
          tableData.push({
            label: 'Intercaladas:',
            value: 'Não possui parcelas intercaladas'
          });
        }

        // Saldo (valor pós entrega) - uses first option's financing value
        const saldoValue = pdfResultados.opcoes[0]?.financiamento || 0;
        tableData.push({
          label: 'Saldo (pós entrega):',
          value: formatarMoeda(saldoValue),
          colorType: 'yellow'
        });

        // Dados da simulação - subtle background (no borders/lines)
        const dataRowHeight = 5;
        const tableHeight = tableData.length * dataRowHeight;
        pdf.setFillColor(238, 242, 248);
        pdf.rect(panelLeft, yPosition, panelWidth, tableHeight, 'F');

        tableData.forEach((row) => {
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(100, 100, 100);
          pdf.text(row.label, panelLeft + 3, yPosition + 3.5);

          const setValueColor = () => {
            if (row.colorType === 'green') {
              pdf.setTextColor(0, 150, 80);
            } else if (row.colorType === 'yellow') {
              pdf.setTextColor(200, 150, 0);
            } else {
              pdf.setTextColor(0, 0, 0);
            }
          };

          pdf.setFont(undefined, 'bold');
          if (row.extraInfo) {
            const fullText = `${row.value} ${row.extraInfo}`;
            const fullTextWidth = pdf.getTextWidth(fullText);
            const valueWidth = pdf.getTextWidth(row.value);
            setValueColor();
            pdf.text(row.value, panelRight - fullTextWidth - 3, yPosition + 3.5);
            pdf.setFont(undefined, 'normal');
            pdf.text(` ${row.extraInfo}`, panelRight - fullTextWidth - 3 + valueWidth, yPosition + 3.5);
          } else {
            setValueColor();
            const valueWidth = pdf.getTextWidth(row.value);
            pdf.text(row.value, panelRight - valueWidth - 3, yPosition + 3.5);
          }
          yPosition += dataRowHeight;
        });

        pdf.setTextColor(0, 0, 0);
        yPosition += 4;
      }

      const hasIntercaladas = isCustom
        ? combosCustom.some(c => (parseFloat(c.percIntercaladas) || 0) > 0)
        : calculatorInputs.temIntercaladas;

      const hasMultipleOptions = pdfResultados.opcoes.length > 1;

      if (hasMultipleOptions) {
      // ============ PROJEÇÃO DE VALORIZAÇÃO (FIPEZAP) ============
      // Fonte única — usa os dados já calculados em fipezapMatch (sem recalcular)
      const fzAnalytics = calculatorInputs?.fipezapMatch;
      const fipezapAnalytics = (fzAnalytics && fzAnalytics.annualizedRate != null) ? fzAnalytics : null;

      if (incluirAnaliseMercado) {
      yPosition = drawSectionHeader('PROJEÇÃO DE VALORIZAÇÃO (FIPEZAP)', yPosition);

      if (fipezapAnalytics) {
        const projData = [
          { label: 'Valorização anualizada:', value: `+${fipezapAnalytics.annualizedRate.toFixed(1)}% a.a.` },
          { label: 'Correção INCC (média):', value: `+${fipezapAnalytics.inccAnnualized.toFixed(1)}% a.a.` },
          { label: 'Ganho real sobre INCC:', value: `${fipezapAnalytics.realGain > 0 ? '+' : ''}${fipezapAnalytics.realGain.toFixed(1)}% a.a.` },
          { label: 'Valor atual do imóvel:', value: formatarMoeda(valorImovel) },
        ];
        if (fipezapAnalytics.neighborhood && fipezapAnalytics.neighborhoodPrice != null) {
          projData.push({ label: `Preço médio do bairro ${fipezapAnalytics.neighborhood}:`, value: `R$ ${Math.round(fipezapAnalytics.neighborhoodPrice).toLocaleString('pt-BR')}/m²` });
        }
        if (fipezapAnalytics.projectedValueAtDelivery != null) {
          projData.push({ label: 'Valor projetado na entrega:', value: formatarMoeda(fipezapAnalytics.projectedValueAtDelivery), isGreen: true });
          projData.push({ label: 'Ganho de patrimônio:', value: `+${formatarMoeda(fipezapAnalytics.equityGain)}`, isGreen: true });
        }

        const projRowHeight = 5;
        const projBoxHeight = projData.length * projRowHeight + 2;
        pdf.setFillColor(238, 242, 248);
        pdf.rect(panelLeft, yPosition, panelWidth, projBoxHeight, 'F');
        pdf.setFontSize(8);
        projData.forEach((row, i) => {
          const rowY = yPosition + i * projRowHeight;
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(100, 100, 100);
          pdf.text(row.label, panelLeft + 3, rowY + 4);
          pdf.setFont(undefined, 'bold');
          if (row.isGreen) {
            pdf.setTextColor(0, 150, 80);
          } else {
            pdf.setTextColor(0, 0, 0);
          }
          const labelW = pdf.getTextWidth(row.label);
          pdf.text(row.value, panelLeft + 3 + labelW + 3, rowY + 4);
        });
        yPosition += projBoxHeight + 4;
      } else {
        pdf.setFontSize(7.5);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(50, 50, 50);
        const noDataLines = pdf.splitTextToSize(
          'Dados de valorização FipeZap não disponíveis para a localização informada.',
          panelWidth - 8
        );
        const noDataHeight = noDataLines.length * 3.5 + 4;
        pdf.setFillColor(238, 242, 248);
        pdf.rect(panelLeft, yPosition, panelWidth, noDataHeight, 'F');
        let ndY = yPosition + 4;
        noDataLines.forEach((line) => {
          pdf.text(line, panelLeft + 4, ndY);
          ndY += 3.5;
        });
        yPosition += noDataHeight + 4;
      }
      } // fim incluirAnaliseMercado

      // ============ PRINCIPAIS ESTRATÉGIAS - 3 CARDS ============
      yPosition = drawSectionHeader('PRINCIPAIS ESTRATÉGIAS', yPosition);
      yPosition += 1;

      const { strategies: pdfStrategies } = classifyScenarios(pdfResultados.opcoes);

      const cardColors = [
        { r: 55, g: 110, b: 180 },  // Blue - Conservative
        { r: 45, g: 130, b: 90 },   // Green - Balanced
        { r: 200, g: 150, b: 30 }   // Amber - Aggressive
      ];

      const executiveOptions = pdfStrategies.map(strategy => {
        const prosCons = generateProsCons(strategy, valorImovel, pdfStrategies);
        return {
          option: strategy,
          perfil: prosCons.name,
          leitura: prosCons.idealFor,
        };
      });

      const numCards = executiveOptions.length;
      const cardGapPdf = 3;
      const cardW = (panelWidth - (numCards - 1) * cardGapPdf) / numCards;
      const cardH = hasIntercaladas ? 26 : 22; // very compact cards

      executiveOptions.forEach((exec, index) => {
        const cardX = panelLeft + index * (cardW + cardGapPdf);
        const color = cardColors[Math.min(index, cardColors.length - 1)];

        // Colored top bar
        pdf.setFillColor(color.r, color.g, color.b);
        pdf.rect(cardX, yPosition, cardW, 1.2, 'F');

        // Card border
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        pdf.rect(cardX, yPosition + 1.2, cardW, cardH - 1.2);

        // Card content
        let cy = yPosition + 4.5;

        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(0, 0, 0);
        pdf.text(exec.perfil, cardX + 2.5, cy);
        cy += 3.5;

        // Helper: draws a gray, normal-weight suffix right after a bold value
        const drawSuffix = (suffix, baseX, valueStr, y) => {
          if (!suffix) return;
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(120, 120, 120);
          pdf.text(suffix, baseX + pdf.getTextWidth(valueStr) + 1.5, y);
        };

        pdf.setFontSize(7.5);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(80, 80, 80);
        pdf.text('Entrada:', cardX + 2.5, cy);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        const entradaStr = formatarMoeda(exec.option.entrada);
        pdf.text(entradaStr, cardX + 18, cy);
        const entradaPerc = valorImovel > 0 ? (exec.option.entrada / valorImovel) * 100 : 0;
        drawSuffix(`(${entradaPerc.toFixed(1)}%)`, cardX + 18, entradaStr, cy);
        cy += 3;

        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(80, 80, 80);
        pdf.text('Mensal:', cardX + 2.5, cy);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(color.r, color.g, color.b);
        const mensalVal = exec.option.mensais.total > 0 ? formatarMoeda(exec.option.mensais.valorParcela) : '-';
        pdf.text(mensalVal, cardX + 18, cy);
        if (exec.option.mensais.total > 0) {
          drawSuffix(`x ${exec.option.mensais.quantidade}`, cardX + 18, mensalVal, cy);
        }
        cy += 3;

        if (hasIntercaladas && exec.option.intercaladas && exec.option.intercaladas.total > 0) {
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(80, 80, 80);
          pdf.text('Intercala:', cardX + 2.5, cy);
          pdf.setFont(undefined, 'bold');
          pdf.setTextColor(180, 120, 20);
          const interStr = formatarMoeda(exec.option.intercaladas.valorParcela);
          pdf.text(interStr, cardX + 18, cy);
          drawSuffix(`x ${exec.option.intercaladas.quantidade}`, cardX + 18, interStr, cy);
          cy += 3;
        }

        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(80, 80, 80);
        pdf.text('Saldo:', cardX + 2.5, cy);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(100, 100, 100);
        const saldoStr = formatarMoeda(exec.option.financiamento || 0);
        pdf.text(saldoStr, cardX + 18, cy);
        const saldoPerc = valorImovel > 0 ? ((exec.option.financiamento || 0) / valorImovel) * 100 : 0;
        drawSuffix(`(${saldoPerc.toFixed(1)}%)`, cardX + 18, saldoStr, cy);
        cy += 3;

        pdf.setFont(undefined, 'italic');
        pdf.setFontSize(5.5);
        pdf.setTextColor(100, 100, 100);
        const leituraText = exec.leitura.length > 60 ? exec.leitura.substring(0, 57) + '...' : exec.leitura;
        const leituraSplit = pdf.splitTextToSize(leituraText, cardW - 5);
        leituraSplit.slice(0, 2).forEach((line, li) => {
          pdf.text(line, cardX + 2.5, cy + li * 2.5);
        });
      });

      yPosition += cardH + 4;

      // ============ COMPARATIVO DE ESTRATÉGIAS ============
      // Evita iniciar a tabela coladinha no rodapé da página
      if (yPosition + 30 > pageHeight - 14) {
        pdf.addPage();
        yPosition = 16;
      }
      yPosition = drawSectionHeader('COMPARATIVO DE ESTRATÉGIAS', yPosition);

      const tableWidth2 = panelWidth;
      const startX = panelLeft;
      const midIndex = Math.floor(pdfResultados.opcoes.length / 2);

      const colWidths = hasIntercaladas ? {
        entrada: 22,
        valorEntrada: 35,
        diferenca: 30,
        mensais: 35,
        difMensal: 30,
        intercaladas: 35
      } : {
        entrada: 25,
        valorEntrada: 40,
        diferenca: 35,
        mensais: 40,
        difMensal: 35
      };

      // Table header — desenhado no início e repetido em cada nova página
      const drawComparativoHeader = () => {
        pdf.setFillColor(55, 90, 145);
        pdf.rect(startX, yPosition, tableWidth2, 6, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7.5);
        pdf.setFont(undefined, 'bold');

        let colX = startX + 4;
        pdf.text('Entrada %', colX, yPosition + 4);
        colX += colWidths.entrada;
        pdf.text('Valor Entrada', colX, yPosition + 4);
        colX += colWidths.valorEntrada;
        pdf.text('Diferença', colX, yPosition + 4);
        colX += colWidths.diferenca;
        pdf.text('Mensal', colX, yPosition + 4);
        colX += colWidths.mensais;
        pdf.text('Dif. Mensal', colX, yPosition + 4);
        colX += colWidths.difMensal;

        if (hasIntercaladas) {
          pdf.text('Intercalada', colX, yPosition + 4);
        }

        yPosition += 6;
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(8);
      };

      drawComparativoHeader();

      const primeiraEntrada = pdfResultados.opcoes[0]?.entrada || 0;
      const primeiraMensal = pdfResultados.opcoes[0]?.mensais?.valorParcela || 0;

      pdfResultados.opcoes.forEach((opcao, index) => {
        const rowHeight = 5;

        // Quebra de página quando a linha não cabe — reserva espaço para o rodapé
        if (yPosition + rowHeight > pageHeight - 14) {
          pdf.addPage();
          yPosition = 16;
          drawComparativoHeader();
        }

        // Row background
        if (index % 2 === 0) {
          pdf.setFillColor(255, 255, 255);
        } else {
          pdf.setFillColor(250, 250, 250);
        }
        pdf.rect(startX, yPosition, tableWidth2, rowHeight, 'F');

        // Yellow left sidebar for highlighted row (equilibrada)
        if (index === midIndex) {
          pdf.setFillColor(217, 150, 30);
          pdf.rect(startX, yPosition, 2, rowHeight, 'F');
        }

        pdf.setTextColor(0, 0, 0);
        let currentX = startX + 4;
        let currentY = yPosition + 3.5;

        const entradaPercent = opcao.tipo.replace(' Entrada', '');

        pdf.setFont(undefined, 'bold');
        pdf.text(entradaPercent, currentX, currentY);
        currentX += colWidths.entrada;

        pdf.setFont(undefined, 'normal');
        pdf.text(formatarMoeda(opcao.entrada), currentX, currentY);
        currentX += colWidths.valorEntrada;

        // Diferença - green color
        if (index === 0) {
          pdf.setTextColor(150, 150, 150);
          pdf.text('—', currentX, currentY);
        } else {
          const diffCumulativa = opcao.entrada - primeiraEntrada;
          pdf.setTextColor(0, 150, 80);
          pdf.text(`+${formatarMoeda(diffCumulativa)}`, currentX, currentY);
        }
        currentX += colWidths.diferenca;

        // Mensal
        pdf.setTextColor(0, 0, 0);
        if (opcao.mensais.total > 0) {
          pdf.text(formatarMoeda(opcao.mensais.valorParcela), currentX, currentY);
        } else {
          pdf.text('-', currentX, currentY);
        }
        currentX += colWidths.mensais;

        // Dif. Mensal - red color
        if (index === 0) {
          pdf.setTextColor(150, 150, 150);
          pdf.text('—', currentX, currentY);
        } else {
          const mensalValue = opcao.mensais.total > 0 ? opcao.mensais.valorParcela : 0;
          if (mensalValue !== primeiraMensal) {
            const diffMensal = mensalValue - primeiraMensal;
            const formattedDiff = formatarMoeda(Math.abs(diffMensal));
            pdf.setTextColor(200, 50, 50);
            pdf.text(`-${formattedDiff}`, currentX, currentY);
          } else {
            pdf.setTextColor(150, 150, 150);
            pdf.text('—', currentX, currentY);
          }
        }
        currentX += colWidths.difMensal;

        // Intercaladas
        if (hasIntercaladas) {
          pdf.setTextColor(0, 0, 0);
          if (opcao.intercaladas && opcao.intercaladas.total > 0) {
            pdf.text(formatarMoeda(opcao.intercaladas.valorParcela), currentX, currentY);
          } else {
            pdf.text('-', currentX, currentY);
          }
        }

        yPosition += rowHeight;

        // Row separator line
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.2);
        pdf.line(startX, yPosition, startX + tableWidth2, yPosition);
      });

      } // fim hasMultipleOptions

      // ============ ASSINATURAS ============
      // Linhas em branco para assinatura de corretor e cliente. Quando ambos
      // assinarem (via Gov.br, fora deste fluxo), o relatório vale como proposta.
      // Exibida apenas em cenário único — com várias opções não se aplica.
      if (!hasMultipleOptions) {
        const sigBlockHeight = 22;
        if (yPosition + sigBlockHeight > pageHeight - 16) {
          pdf.addPage();
          yPosition = 16;
        }
        yPosition += 8;
        const sigLineY = yPosition + 10;
        const sigGap = 16;
        const sigWidth = (panelWidth - sigGap) / 2;
        const sigLeftX = panelLeft;
        const sigRightX = panelLeft + sigWidth + sigGap;
        pdf.setDrawColor(120, 120, 120);
        pdf.setLineWidth(0.3);
        pdf.line(sigLeftX, sigLineY, sigLeftX + sigWidth, sigLineY);
        pdf.line(sigRightX, sigLineY, sigRightX + sigWidth, sigLineY);
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(80, 80, 80);
        let corretorSigLabel = 'Corretor';
        if (info.corretor?.nome) {
          corretorSigLabel = `Corretor — ${info.corretor.nome}`;
          if (info.corretor.creci) corretorSigLabel += ` · CRECI ${info.corretor.creci}`;
        }
        const clienteSigLabel = info.cliente?.nome ? `Cliente — ${info.cliente.nome}` : 'Cliente';
        pdf.text(corretorSigLabel, sigLeftX + sigWidth / 2, sigLineY + 4, { align: 'center' });
        pdf.text(clienteSigLabel, sigRightX + sigWidth / 2, sigLineY + 4, { align: 'center' });
      }

      // ============ FOOTER ============
      const footerY = pageHeight - 8;
      pdf.setFontSize(6.5);
      pdf.setFont(undefined, 'italic');
      pdf.setTextColor(120, 120, 120);
      // Aviso de variação de valores: apenas em relatórios com vários cenários.
      // Em cenário único o documento pode ser assinado como proposta — não deve
      // declarar que os valores podem mudar.
      if (hasMultipleOptions) {
        pdf.text('Valores apresentados assim como disponibilidade podem sofrer alterações sem aviso prévio.', panelLeft, footerY);
      }

      const footerDate = hasMultipleOptions
        ? `Simulação gerada em ${formattedDateFull}`
        : `Documento gerado em ${formattedDateFull}`;
      const footerDateWidth = pdf.getTextWidth(footerDate);
      pdf.text(footerDate, panelRight - footerDateWidth, footerY);

      pdf.save('relatorio-simulacao.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // Extract percentage number from tipo string like "12.0% Entrada"
  const extractPercentage = (tipo) => {
    const match = tipo.match(/[\d.]+/);
    return match ? Math.round(parseFloat(match[0])) : tipo;
  };

  const positionLabel = (pos) => {
    if (pos === 'single') return 'Único cenário viável';
    if (pos === 'leve') return 'Entrada mais leve';
    if (pos === 'forte') return 'Entrada mais forte';
    return 'Intermediário';
  };

  const filterLabels = { entrada: 'entrada disponível', mensal: 'parcela mensal', size: 'tamanho da entrada' };

  const sizeOkFor = (o) =>
    filterSize === 'all' ||
    (filterSize === 'baixas' && o.entrada <= entradaMedian) ||
    (filterSize === 'altas' && o.entrada >= entradaMedian);

  const autoRelax = () => {
    if (mostRestrictive === 'entrada') {
      const candidates = customOpcoes
        .filter(o =>
          (filterMensal == null || (o.mensais?.valorParcela || 0) <= filterMensal) &&
          sizeOkFor(o)
        )
        .map(o => o.entrada)
        .sort((a, b) => a - b);
      if (candidates.length) setFilterEntrada(candidates[0]);
    } else if (mostRestrictive === 'mensal') {
      const candidates = customOpcoes
        .filter(o =>
          (filterEntrada == null || o.entrada <= filterEntrada) &&
          sizeOkFor(o)
        )
        .map(o => o.mensais?.valorParcela || 0)
        .sort((a, b) => a - b);
      if (candidates.length) setFilterMensal(candidates[0]);
    } else if (mostRestrictive === 'size') {
      setFilterSize('all');
    }
  };

  const renderStepper = (onDec, onInc, value) => (
    <div className="flex items-center gap-1.5">
      <button onClick={onDec} className="w-6 h-6 rounded-full border border-surface-border flex items-center justify-center text-ink-faint hover:bg-surface-hover active:scale-90 transition-all">
        <Minus size={12} />
      </button>
      <span className="text-sm font-bold text-ink-base min-w-[100px] text-right">{value}</span>
      <button onClick={onInc} className="w-6 h-6 rounded-full border border-surface-border flex items-center justify-center text-ink-faint hover:bg-surface-hover active:scale-90 transition-all">
        <Plus size={12} />
      </button>
    </div>
  );

  const renderScenarioCard = (item, opts = {}) => {
    const { compact = false } = opts;
    const { index, opcao, insight, position } = item;
    const isSelectedForPdf = selectedForPdf[index] !== false;
    const isPinned = pinnedIndices.has(index);
    const perc = extractPercentage(opcao.tipo);

    return (
      <div
        key={index}
        className={`rounded-2xl border overflow-hidden bg-surface-card transition-all duration-200 ${
          isPinned ? 'border-brand-400 ring-2 ring-brand-200' : 'border-surface-border'
        } ${isSelectedForPdf ? '' : 'opacity-60'}`}
      >
        <div className="p-5">
          <div className="mb-4 pb-3 border-b border-surface-border flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wide">
              {compact ? `${perc}% de entrada` : positionLabel(position)}
            </span>
            <button
              type="button"
              onClick={() => copyScenario(opcao, perc, index)}
              title="Copiar dados do cenário"
              aria-label="Copiar dados do cenário"
              className="flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-brand-600 transition-colors flex-shrink-0"
            >
              {copiedIdx === index
                ? <><Check size={14} className="text-emerald-500" /> Copiado</>
                : <><Copy size={14} /> Copiar</>}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm text-ink-muted">Entrada <span className="text-xs text-ink-faint">({perc}%)</span></span>
              </div>
              {renderStepper(
                () => adjustScenario(index, 'entrada', -1),
                () => adjustScenario(index, 'entrada', 1),
                formatarMoeda(opcao.entrada)
              )}
            </div>

            {opcao.mensais.total > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-sm text-ink-muted">Mensal <span className="text-xs text-ink-faint">× {opcao.mensais.quantidade}</span></span>
                </div>
                {renderStepper(
                  () => adjustScenario(index, 'mensais', -1),
                  () => adjustScenario(index, 'mensais', 1),
                  formatarMoeda(opcao.mensais.valorParcela)
                )}
              </div>
            )}

            {opcao.intercaladas && opcao.intercaladas.total > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-sm text-ink-muted capitalize">{opcao.intercaladas.tipo} <span className="text-xs text-ink-faint">× {opcao.intercaladas.quantidade}</span></span>
                </div>
                {renderStepper(
                  () => adjustScenario(index, 'intercaladas', -1),
                  () => adjustScenario(index, 'intercaladas', 1),
                  formatarMoeda(opcao.intercaladas.valorParcela)
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-300" />
                <span className="text-sm text-ink-muted">Saldo pós-chaves</span>
              </div>
              <span className="text-sm font-bold text-ink-base">{formatarMoeda(opcao.financiamento)}</span>
            </div>
          </div>

          {insight && (
            <p className="mt-4 text-xs text-amber-800 bg-amber-50 rounded-lg p-2.5 leading-relaxed">
              {insight}
            </p>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => togglePin(index)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg py-2 border-2 transition-colors ${
                isPinned
                  ? 'border-brand-500 bg-brand-500 text-white hover:bg-brand-600'
                  : 'border-brand-300 text-brand-600 hover:bg-brand-50'
              }`}
            >
              <Pin size={14} className={isPinned ? 'fill-current' : ''} />
              {isPinned ? 'Selecionado' : 'Comparar'}
            </button>
            <button
              onClick={() => handleInccButtonClick(opcao)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-ink-muted border-2 border-surface-border rounded-lg py-2 hover:bg-surface-hover transition-colors"
            >
              <BarChart3 size={14} />
              INCC
            </button>
          </div>

          {/* Share toggle */}
          <div className="mt-4 pt-4 border-t border-surface-border flex items-center justify-between">
            <span className="text-sm text-ink-muted">Compartilhar</span>
            <button
              type="button"
              role="switch"
              aria-checked={isSelectedForPdf}
              onClick={() => toggleScenario(index)}
              className="flex items-center"
            >
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isSelectedForPdf ? 'bg-brand-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isSelectedForPdf ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const cellClass = (metric, value) => {
    if (!metric || metric.min === metric.max) return '';
    if (value === metric.min) return 'bg-emerald-50 text-emerald-700 font-bold';
    if (value === metric.max) return 'bg-rose-50 text-rose-700 font-bold';
    return 'text-ink-base font-semibold';
  };

  const renderLupaContent = () => {
    if (pinnedScenarios.length < 2 || !lupaMetrics) return null;
    return (
      <>
        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-surface-border">
                <th className="text-left py-2 px-3 text-xs font-semibold text-ink-faint uppercase">Métrica</th>
                {pinnedScenarios.map((o, i) => (
                  <th key={i} className="py-2 px-3 text-xs font-semibold text-ink-base text-center">
                    {extractPercentage(o.tipo)}% entrada
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-surface-border">
                <td className="py-3 px-3 text-ink-muted">Entrada</td>
                {pinnedScenarios.map((o, i) => (
                  <td key={i} className={`py-3 px-3 text-center ${cellClass(lupaMetrics.entrada, o.entrada)}`}>
                    {formatarMoeda(o.entrada)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-surface-border">
                <td className="py-3 px-3 text-ink-muted">Parcela mensal</td>
                {pinnedScenarios.map((o, i) => (
                  <td key={i} className={`py-3 px-3 text-center ${cellClass(lupaMetrics.mensal, o.mensais?.valorParcela || 0)}`}>
                    {formatarMoeda(o.mensais?.valorParcela || 0)}
                  </td>
                ))}
              </tr>
              {lupaMetrics.intercalada && (
                <tr className="border-b border-surface-border">
                  <td className="py-3 px-3 text-ink-muted">Intercalada</td>
                  {pinnedScenarios.map((o, i) => (
                    <td key={i} className={`py-3 px-3 text-center ${cellClass(lupaMetrics.intercalada, o.intercaladas?.valorParcela || 0)}`}>
                      {(o.intercaladas?.valorParcela || 0) > 0 ? formatarMoeda(o.intercaladas.valorParcela) : '—'}
                    </td>
                  ))}
                </tr>
              )}
              <tr className="border-b border-surface-border">
                <td className="py-3 px-3 text-ink-muted">Saldo pós-chaves</td>
                {pinnedScenarios.map((o, i) => (
                  <td key={i} className={`py-3 px-3 text-center ${cellClass(lupaMetrics.saldo, o.financiamento || 0)}`}>
                    {formatarMoeda(o.financiamento || 0)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-3 text-ink-muted">Total pago</td>
                {pinnedScenarios.map((o, i) => (
                  <td key={i} className={`py-3 px-3 text-center ${cellClass(lupaMetrics.total, o.total || 0)}`}>
                    {formatarMoeda(o.total || 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked */}
        <div className="md:hidden space-y-3">
          {pinnedScenarios.map((o, i) => (
            <div key={i} className="bg-surface-raised rounded-xl p-3">
              <p className="text-xs font-bold text-ink-muted uppercase mb-3">{extractPercentage(o.tipo)}% entrada</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Entrada</span>
                  <span className={cellClass(lupaMetrics.entrada, o.entrada) || 'text-ink-base font-semibold'}>
                    {formatarMoeda(o.entrada)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Parcela</span>
                  <span className={cellClass(lupaMetrics.mensal, o.mensais?.valorParcela || 0) || 'text-ink-base font-semibold'}>
                    {formatarMoeda(o.mensais?.valorParcela || 0)}
                  </span>
                </div>
                {lupaMetrics.intercalada && (
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Intercalada</span>
                    <span className={cellClass(lupaMetrics.intercalada, o.intercaladas?.valorParcela || 0) || 'text-ink-base font-semibold'}>
                      {(o.intercaladas?.valorParcela || 0) > 0 ? formatarMoeda(o.intercaladas.valorParcela) : '—'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-ink-muted">Saldo</span>
                  <span className={cellClass(lupaMetrics.saldo, o.financiamento || 0) || 'text-ink-base font-semibold'}>
                    {formatarMoeda(o.financiamento || 0)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-surface-border">
                  <span className="text-ink-muted">Total</span>
                  <span className={cellClass(lupaMetrics.total, o.total || 0) || 'text-ink-base font-semibold'}>
                    {formatarMoeda(o.total || 0)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderScenariosSection = () => {
    const totalScenarios = customOpcoes.length;
    const fittingCount = filteredSorted.length;

    const countColor =
      fittingCount === 0 ? 'bg-rose-50 text-rose-700' :
      fittingCount === 1 ? 'bg-amber-50 text-amber-700' :
      fittingCount === 2 ? 'bg-amber-50 text-amber-700' :
      'bg-emerald-50 text-emerald-700';

    return (
      <>
        <h2 className="text-lg font-bold text-ink-base mb-3">Cenários de pagamento</h2>

        {/* Filtro de cenários (recolhível) */}
        <Card variant="outlined" padding="lg" className="mb-6">
          <div className={`flex items-center justify-between gap-3 flex-wrap ${filtroPerfilAberto ? 'mb-5' : ''}`}>
            <button
              type="button"
              onClick={() => setFiltroPerfilAberto(v => !v)}
              aria-expanded={filtroPerfilAberto}
              className="text-base font-bold text-ink-base flex items-center gap-2"
            >
              <Search size={18} className="text-brand-600" />
              Filtro de cenários
              <ChevronUp
                size={18}
                className={`text-ink-faint transition-transform duration-200 ${filtroPerfilAberto ? '' : 'rotate-180'}`}
              />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${countColor}`}>
                {hasActiveFilters
                  ? `${fittingCount} de ${totalScenarios} ${fittingCount === 1 ? 'cabe' : 'cabem'}`
                  : `${totalScenarios} ${totalScenarios === 1 ? 'cenário' : 'cenários'}`}
              </span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-ink-faint hover:text-ink-base underline"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {filtroPerfilAberto && (
          <>
          <div className="mb-5">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-semibold text-ink-muted">Quanto consigo adiantar hoje?</label>
              <span className={`text-sm font-bold ${filterEntrada != null ? 'text-brand-600' : 'text-ink-faint italic'}`}>
                {filterEntrada != null ? `Até ${formatarMoeda(filterEntrada)}` : 'Sem limite'}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.ceil(entradaRange.max * 1.1)}
              step={1000}
              value={filterEntrada ?? Math.ceil(entradaRange.max * 1.1)}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                const isMax = v >= Math.ceil(entradaRange.max * 1.1);
                setFilterEntrada(isMax ? null : v);
              }}
              className="w-full accent-brand-500"
            />
          </div>

          <div className="mb-5">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-semibold text-ink-muted">Quanto cabe por mês?</label>
              <span className={`text-sm font-bold ${filterMensal != null ? 'text-brand-600' : 'text-ink-faint italic'}`}>
                {filterMensal != null ? `Até ${formatarMoeda(filterMensal)}/mês` : 'Sem limite'}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.ceil(mensalRange.max * 1.1)}
              step={100}
              value={filterMensal ?? Math.ceil(mensalRange.max * 1.1)}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                const isMax = v >= Math.ceil(mensalRange.max * 1.1);
                setFilterMensal(isMax ? null : v);
              }}
              className="w-full accent-brand-500"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-ink-muted mb-2 block">Preferência pelo tamanho da entrada?</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'baixas', label: 'Entradas baixas' },
                { value: 'all', label: 'Todas' },
                { value: 'altas', label: 'Entradas altas' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterSize(opt.value)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                    filterSize === opt.value
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white text-ink-muted border-surface-border hover:border-ink-faint'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {filterSize !== 'all' && entradaMedian > 0 && (
              <p className="text-xs text-ink-faint mt-2">
                {filterSize === 'baixas'
                  ? `Mostra cenários com entrada até ${formatarMoeda(entradaMedian)} (metade inferior).`
                  : `Mostra cenários com entrada a partir de ${formatarMoeda(entradaMedian)} (metade superior).`}
              </p>
            )}
          </div>
          </>
          )}
        </Card>

        {/* Zona 2 — Cenários / States */}
        {fittingCount === 0 && hasActiveFilters ? (
          /* Conflict state */
          <Card variant="outlined" padding="lg" className="ring-2 ring-rose-200 mb-6 pb-20">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <X size={28} className="text-rose-600" />
              </div>
              <h3 className="text-base font-bold text-ink-base mb-1">Nenhum cenário atende seus critérios</h3>
              {mostRestrictive && (
                <p className="text-sm text-ink-muted">
                  Filtro mais restritivo: <strong className="text-ink-base">{filterLabels[mostRestrictive]}</strong>
                </p>
              )}
            </div>

            {mostRestrictive && autoRelaxCount > 0 && (
              <div className="bg-surface-raised rounded-xl p-4 mb-4 max-w-lg mx-auto">
                <p className="text-sm text-ink-muted">
                  Afrouxando o filtro de <strong className="text-ink-base">{filterLabels[mostRestrictive]}</strong>, <strong className="text-ink-base">{autoRelaxCount} {autoRelaxCount === 1 ? 'cenário fica disponível' : 'cenários ficam disponíveis'}</strong>.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center flex-wrap">
              {mostRestrictive && autoRelaxCount > 0 && (
                <button
                  onClick={autoRelax}
                  className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors"
                >
                  Ajustar automaticamente
                </button>
              )}
              <button
                onClick={clearFilters}
                className="px-5 py-2.5 bg-white border-2 border-surface-border text-ink-muted rounded-xl text-sm font-semibold hover:bg-surface-hover transition-colors"
              >
                Limpar filtros
              </button>
            </div>
          </Card>
        ) : (
          <>
            {/* Todos os cenários listados de forma uniforme */}
            {fittingCount === 1 && hasActiveFilters && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3 inline-block">
                Apenas 1 cenário atende seus critérios. Relaxe um filtro para ver alternativas.
              </p>
            )}

            {totalCount > 0 && (
              <Card variant="outlined" padding="md" className="mb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Share2 size={18} className="text-brand-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-ink-base">Incluir todos os cenários no relatório</span>
                    <span className="text-xs text-ink-faint flex-shrink-0">({selectedCount}/{totalCount})</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={selectedCount === totalCount}
                    onClick={toggleAllScenarios}
                    className="flex items-center flex-shrink-0"
                  >
                    <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${selectedCount === totalCount ? 'bg-brand-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${selectedCount === totalCount ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </button>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
              {filteredSorted.map(item => renderScenarioCard(item, { compact: true }))}
            </div>

            {/* Single-result quick relax chips */}
            {fittingCount === 1 && hasActiveFilters && (
              <Card variant="outlined" padding="md" className="mb-6">
                <p className="text-sm font-semibold text-ink-muted mb-3">Quer ver mais opções? Relaxe um filtro:</p>
                <div className="flex flex-wrap gap-2">
                  {filterEntrada != null && (
                    <button
                      onClick={() => setFilterEntrada(Math.min(entradaRange.max * 1.1, filterEntrada + 5000))}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 border-surface-border bg-white text-ink-muted hover:border-ink-faint"
                    >
                      +R$ 5.000 de entrada
                    </button>
                  )}
                  {filterMensal != null && (
                    <button
                      onClick={() => setFilterMensal(Math.min(mensalRange.max * 1.1, filterMensal + 500))}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 border-surface-border bg-white text-ink-muted hover:border-ink-faint"
                    >
                      +R$ 500/mês
                    </button>
                  )}
                  {filterSize !== 'all' && (
                    <button
                      onClick={() => setFilterSize('all')}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 border-surface-border bg-white text-ink-muted hover:border-ink-faint"
                    >
                      Ver todas as entradas
                    </button>
                  )}
                </div>
              </Card>
            )}

            {/* Discarded scenarios */}
            {discarded.length > 0 && hasActiveFilters && (
              <Card variant="outlined" padding="md" className="mb-6">
                <p className="text-xs font-semibold text-ink-faint mb-3 uppercase tracking-wide">
                  {discarded.length} cenário{discarded.length > 1 ? 's' : ''} fora dos seus filtros
                </p>
                <div className="flex flex-wrap gap-2">
                  {discarded.map(d => (
                    <span
                      key={d.index}
                      className="text-xs bg-surface-raised text-ink-faint px-3 py-1.5 rounded-lg"
                    >
                      {d.perc}% entrada · <span className="text-rose-600">{d.reason}</span>
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Bottom spacer to avoid overlap with floating action bar */}
        <div className="h-24" />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Breadcrumb */}
        <div className="mb-2">
          <Breadcrumb items={[
            { label: 'Calculadora', href: '/calculadora' },
            { label: 'Resultados' },
          ]} />
        </div>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-ink-base tracking-tight">
            Resultados da Simulação
          </h1>
          <p className="text-sm text-ink-faint mt-1">
            {resultados.opcoes.length} cenários de pagamento gerados
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 sm:gap-3 mb-8">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
              <Check size={14} className="text-white" />
            </div>
            <span className="text-sm text-ink-faint hidden sm:inline">Dados</span>
          </div>
          <div className="w-8 sm:w-12 h-0.5 bg-brand-500" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">2</span>
            </div>
            <span className="text-sm font-semibold text-ink-base">Resultados</span>
          </div>
          <div className="w-8 sm:w-12 h-0.5 bg-surface-border" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-6 h-6 rounded-full bg-surface-border flex items-center justify-center">
              <span className="text-xs font-bold text-ink-faint">3</span>
            </div>
            <span className="text-sm text-ink-faint hidden sm:inline">INCC</span>
          </div>
        </div>


        {/* Summary Cards */}
        <div ref={contentRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <Card variant="outlined" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Calendar size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-ink-faint">Prazo</p>
                <p className="text-lg font-bold text-ink-base">{resultados.mesesAteEntrega} meses</p>
              </div>
            </div>
          </Card>

          <Card variant="outlined" padding="md" className="ring-1 ring-emerald-200 bg-emerald-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-ink-faint">Valor Total</p>
                <p className="text-lg font-bold text-emerald-700">{formatarMoeda(parseFloat(calculatorInputs.valorImovel))}</p>
                <p className="text-xs text-ink-faint">Valor do imóvel</p>
              </div>
            </div>
          </Card>

          <Card variant="outlined" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <DollarSign size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-ink-faint">Total até Entrega</p>
                <p className="text-lg font-bold text-ink-base">{formatarMoeda(resultados.valorTotalAteEntrega)}</p>
              </div>
            </div>
          </Card>

          <Card variant="outlined" padding="md" className="ring-1 ring-brand-200 bg-brand-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                <Building2 size={20} className="text-brand-600" />
              </div>
              <div>
                <p className="text-xs text-ink-faint">Saldo</p>
                <p className="text-lg font-bold text-brand-700">{formatarMoeda(customOpcoes[0]?.financiamento || 0)}</p>
                <p className="text-xs text-ink-faint">Valor pós entrega</p>
              </div>
            </div>
          </Card>

          {calculatorInputs?.fipezapMatch && (() => {
            const fzMatch = calculatorInputs.fipezapMatch;
            const cityName = fzMatch.cityName;
            const valorImovelNum = parseFloat(calculatorInputs.valorImovel);

            const cityAnnualRate = fzMatch.annualizedRate;
            const realGain = fzMatch.realGain;

            // Fonte única: projeção já calculada (mesma usada no relatório compartilhado)
            const mesesAteEntrega = fzMatch.mesesAteEntrega || 0;
            const projectedValue = fzMatch.projectedValueAtDelivery ?? null;
            const equityGain = fzMatch.equityGain ?? null;

            const propertyPriceM2 = reportInfo.imovel.metragem && parseFloat(reportInfo.imovel.metragem) > 0
              ? valorImovelNum / parseFloat(reportInfo.imovel.metragem)
              : null;

            const fmtM2 = (v) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;

            const cityBairros = getCityData(cityName, getLatestPeriod())?.h || [];
            const selectedNb = fzMatch.neighborhood;
            const maxBairroPrice = Math.max(...cityBairros.map((b) => b.p), 1);

            return (
              <>
              <Card variant="outlined" padding="md" className="col-span-full">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={20} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-ink-faint">Análise FipeZap+ · {cityName}</p>
                    <p className="text-base font-bold text-ink-base">Posição do imóvel no mercado</p>
                  </div>
                </div>

                {/* Preços: seu imóvel × média da cidade */}
                <div className="rounded-xl bg-white ring-1 ring-surface-border p-4 mb-3">
                  <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wide mb-1">Preço médio por m²</p>

                  <div className="divide-y divide-surface-border">
                    {/* Seu imóvel */}
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-base">Seu imóvel</p>
                        {reportInfo.imovel.metragem && parseFloat(reportInfo.imovel.metragem) > 0 && (
                          <p className="text-[11px] text-ink-faint">{reportInfo.imovel.metragem} m²</p>
                        )}
                      </div>
                      {propertyPriceM2 != null ? (
                        <p className="text-lg font-bold text-emerald-700 flex-shrink-0">
                          {fmtM2(propertyPriceM2)}<span className="text-xs font-normal text-ink-faint">/m²</span>
                        </p>
                      ) : (
                        <p className="text-xs text-ink-faint flex-shrink-0">Informe a metragem</p>
                      )}
                    </div>

                    {/* Bairro */}
                    {fzMatch.neighborhood && fzMatch.neighborhoodPrice != null && (
                      <div className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink-base truncate">Bairro {fzMatch.neighborhood}</p>
                          {fzMatch.neighborhoodVar && (
                            <p className="text-[11px] text-ink-faint">{fzMatch.neighborhoodVar} em 12 meses</p>
                          )}
                        </div>
                        <p className="text-lg font-bold text-ink-base flex-shrink-0">
                          {fmtM2(fzMatch.neighborhoodPrice)}<span className="text-xs font-normal text-ink-faint">/m²</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {cityBairros.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowBairros(true)}
                      className="flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 mt-2 pt-3 border-t border-surface-border w-full"
                    >
                      <BarChart3 size={14} /> Comparar todos os bairros ({cityBairros.length})
                    </button>
                  )}
                </div>

                {/* Valorização + projeção (valorização integrada no header) */}
                {cityAnnualRate != null && (
                  <div className="rounded-xl bg-white ring-1 ring-surface-border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-ink-base">Projeção de valorização</p>
                      <button
                        type="button"
                        onClick={() => setMetricDetail('valorizacao')}
                        className="flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
                      >
                        +{cityAnnualRate.toFixed(1)}% a.a. <Info size={12} className="text-ink-faint" />
                      </button>
                    </div>
                    {projectedValue != null && (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="text-center flex-shrink-0">
                            <p className="text-[11px] text-ink-faint">hoje</p>
                            <p className="text-base font-bold text-ink-base">{formatarMoeda(valorImovelNum)}</p>
                          </div>
                          <div className="flex-1 flex flex-col items-center min-w-0">
                            <span className="text-[10px] text-ink-faint mb-0.5">{mesesAteEntrega} meses</span>
                            <div className="w-full h-0.5 bg-emerald-300 relative">
                              <span className="absolute -right-1 -top-1.5 text-emerald-500 text-[10px]">▶</span>
                            </div>
                          </div>
                          <div className="text-center flex-shrink-0">
                            <p className="text-[11px] text-emerald-600">na entrega</p>
                            <p className="text-lg sm:text-xl font-extrabold text-emerald-700">{formatarMoeda(projectedValue)}</p>
                          </div>
                        </div>
                        {equityGain != null && equityGain > 0 && (
                          <div className="mt-3 text-center bg-emerald-50 rounded-lg py-1.5">
                            <span className="text-sm font-bold text-emerald-700">+ {formatarMoeda(equityGain)}</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Ganho real — legenda que qualifica a projeção (clica = detalhe INCC) */}
                    {realGain != null && (
                      <button
                        type="button"
                        onClick={() => setMetricDetail('incc')}
                        className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-ink-muted hover:text-ink-base transition-colors"
                      >
                        Ganho real após INCC:
                        <span className={`font-semibold ${realGain < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                          {realGain >= 0 ? '+' : ''}{realGain.toFixed(1)}% a.a.
                        </span>
                        <Info size={11} className="text-ink-faint" />
                      </button>
                    )}
                  </div>
                )}

                {/* Rodapé — incluir a análise no relatório */}
                <div className="mt-3 pt-3 border-t border-surface-border flex items-center justify-between gap-2">
                  <span className="text-sm text-ink-muted">Incluir esta análise no relatório</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={incluirAnaliseMercado}
                    onClick={() => setIncluirAnaliseMercado((v) => !v)}
                    className="flex items-center"
                  >
                    <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${incluirAnaliseMercado ? 'bg-brand-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${incluirAnaliseMercado ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </button>
                </div>
              </Card>

              <Modal
                open={showBairros}
                onClose={() => setShowBairros(false)}
                title={`Bairros de ${cityName}`}
                size="md"
              >
                <div className="flex gap-3 mb-4">
                  {propertyPriceM2 != null && (
                    <div className="flex-1 rounded-lg bg-emerald-50 ring-1 ring-emerald-200 p-2 text-center">
                      <p className="text-[11px] text-ink-faint">Seu imóvel</p>
                      <p className="font-bold text-emerald-700 text-sm">{fmtM2(propertyPriceM2)}/m²</p>
                    </div>
                  )}
                  <div className="flex-1 rounded-lg bg-surface-muted p-2 text-center">
                    <p className="text-[11px] text-ink-faint">Média de {cityName}</p>
                    <p className="font-bold text-ink-base text-sm">{fmtM2(fzMatch.price)}/m²</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {[...cityBairros].sort((a, b) => b.p - a.p).map((h) => {
                    const isSelected = h.n === selectedNb;
                    const vsProp = propertyPriceM2 != null ? ((h.p - propertyPriceM2) / propertyPriceM2) * 100 : null;
                    return (
                      <div
                        key={h.n}
                        className={`rounded-lg px-3 py-2 ${isSelected ? 'bg-brand-50 ring-1 ring-brand-300' : 'hover:bg-surface-muted'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${isSelected ? 'font-semibold text-brand-700' : 'text-ink-base'}`}>{h.n}</span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {vsProp != null && (
                              <span className={`text-[11px] font-medium ${vsProp >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {vsProp >= 0 ? '+' : ''}{vsProp.toFixed(0)}%
                              </span>
                            )}
                            <span className="text-sm font-bold text-ink-base w-24 text-right">{fmtM2(h.p)}/m²</span>
                          </div>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isSelected ? 'bg-brand-500' : 'bg-emerald-400'}`}
                            style={{ width: `${Math.max((h.p / maxBairroPrice) * 100, 3)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-ink-faint mt-3">
                  % = quanto o bairro é mais caro que o seu imóvel · barra: preço relativo ao bairro mais caro.
                </p>
              </Modal>
              </>
            );
          })()}
        </div>

        {renderScenariosSection()}
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
        <div className="max-w-6xl mx-auto pointer-events-auto flex gap-3">
          <button
            onClick={() => navigate('/calculadora', { state: { calculatorInputs } })}
            className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl shadow-lg font-semibold text-sm bg-white border border-surface-border text-ink-base hover:bg-surface-hover active:scale-95 transition-all duration-200"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Nova Simulação</span>
          </button>
          <button
            onClick={() => setShowCompareModal(true)}
            disabled={pinnedIndices.size < 2}
            className={`flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl shadow-lg font-semibold text-sm transition-all duration-200 ${
              pinnedIndices.size < 2
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border-2 border-brand-400 text-brand-700 hover:bg-brand-50 active:scale-95'
            }`}
            title={pinnedIndices.size < 2 ? 'Selecione 2 ou mais cenários para comparar' : 'Abrir comparação'}
          >
            <Search size={18} />
            <span className="hidden sm:inline">Comparar</span>
            {pinnedIndices.size > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                pinnedIndices.size < 2 ? 'bg-gray-200 text-gray-500' : 'bg-brand-500 text-white'
              }`}>
                {pinnedIndices.size}
              </span>
            )}
          </button>
          <ShareMenu
            customOpcoes={customOpcoes}
            calculatorInputs={incluirAnaliseMercado ? calculatorInputs : { ...calculatorInputs, fipezapMatch: null }}
            resultados={resultados}
            reportInfo={reportInfo}
            selectedForPdf={selectedForPdf}
            selectedCount={selectedCount}
            totalCount={totalCount}
            onExportPdf={handleExportClick}
            neighborhoods={shareNeighborhoods}
          />
        </div>
      </div>

      {/* Comparison modal */}
      {showCompareModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCompareModal(false)}
        >
          <div
            className="bg-surface-card rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-ink-base flex items-center gap-2">
                  <Search size={20} className="text-brand-600" />
                  Comparando {pinnedScenarios.length} {pinnedScenarios.length === 1 ? 'cenário' : 'cenários'}
                </h2>
                <div className="flex items-center gap-3">
                  {pinnedScenarios.length > 0 && (
                    <button
                      onClick={() => setPinnedIndices(new Set())}
                      className="text-xs text-ink-faint hover:text-ink-base underline"
                    >
                      Limpar seleção
                    </button>
                  )}
                  <button
                    onClick={() => setShowCompareModal(false)}
                    className="w-8 h-8 rounded-full hover:bg-surface-hover flex items-center justify-center text-ink-muted"
                    aria-label="Fechar"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {pinnedScenarios.length < 2 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-ink-muted mb-2">
                    Selecione pelo menos 2 cenários para comparar.
                  </p>
                  <p className="text-xs text-ink-faint">
                    Use o botão <strong>Comparar</strong> em cada cenário para adicioná-lo.
                  </p>
                </div>
              ) : (
                renderLupaContent()
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal for report information */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-ink-base mb-6">Informações do Relatório</h2>

              {/* Corretor Section */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-ink-base mb-3 border-b border-surface-border pb-2">Dados do Corretor</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-base mb-1">
                      Nome <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={reportInfo.corretor.nome}
                      onChange={(e) => handleInputChange('corretor', 'nome', e.target.value)}
                      className="w-full px-3 py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
                      placeholder="Nome do corretor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-base mb-1">
                      CRECI-AL
                    </label>
                    <input
                      type="text"
                      value={reportInfo.corretor.creci}
                      onChange={(e) => handleInputChange('corretor', 'creci', e.target.value)}
                      className="w-full px-3 py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
                      placeholder="Número do CRECI-AL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-base mb-1">
                      Contato
                    </label>
                    <input
                      type="text"
                      value={reportInfo.corretor.contato}
                      onChange={(e) => handleInputChange('corretor', 'contato', e.target.value)}
                      className="w-full px-3 py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
                      placeholder="Telefone ou e-mail"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    onClick={excluirCorretorSalvo}
                  >
                    Limpar
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Save size={14} />}
                    onClick={salvarCorretorAtual}
                    disabled={!reportInfo.corretor.nome || corretorSalvo}
                  >
                    {corretorSalvo ? 'Corretor salvo' : 'Salvar corretor'}
                  </Button>
                </div>
              </div>

              {/* Cliente Section — opcional, permite usar o relatório como proposta */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-ink-base mb-1 border-b border-surface-border pb-2">
                  Dados do Cliente <span className="text-sm font-normal text-ink-faint">(opcional)</span>
                </h3>
                <p className="text-xs text-ink-faint mb-3 mt-2">
                  Preencha para usar o relatório como proposta. Aparecem no PDF apenas quando informados.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-base mb-1">Nome completo</label>
                    <input
                      type="text"
                      value={reportInfo.cliente?.nome || ''}
                      onChange={(e) => handleInputChange('cliente', 'nome', e.target.value)}
                      className="w-full px-3 py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
                      placeholder="Nome completo do cliente"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-base mb-1">CPF</label>
                    <input
                      type="text"
                      value={reportInfo.cliente?.cpf || ''}
                      onChange={(e) => handleInputChange('cliente', 'cpf', formatCpf(e.target.value))}
                      className="w-full px-3 py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              </div>

              {/* Empreendimento Section — dados reaproveitáveis (salvos no dispositivo) */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-ink-base mb-3 border-b border-surface-border pb-2">Dados do Empreendimento</h3>
                {imoveisSalvos.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-ink-base mb-1">Empreendimento salvo</label>
                    <div className="flex gap-2">
                      <select
                        value={imovelSelecionadoId || ''}
                        onChange={(e) => {
                          if (e.target.value) selecionarImovel(e.target.value);
                          else setImovelSelecionadoId(null);
                        }}
                        className="flex-1 min-w-0 px-3 py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
                      >
                        <option value="">Selecione um empreendimento...</option>
                        {imoveisSalvos.map(imovel => (
                          <option key={imovel.id} value={imovel.id}>{imovel.nome}</option>
                        ))}
                      </select>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={() => imovelSelecionadoId && excluirImovelSalvo(imovelSelecionadoId)}
                        disabled={!imovelSelecionadoId}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-base mb-1">
                      Nome do Empreendimento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={reportInfo.imovel.nome}
                      onChange={(e) => handleInputChange('imovel', 'nome', e.target.value)}
                      className="w-full px-3 py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
                      placeholder="Nome ou identificação do empreendimento"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-base mb-1">
                      Endereço
                    </label>
                    <input
                      type="text"
                      value={reportInfo.imovel.localizacao}
                      onChange={(e) => handleInputChange('imovel', 'localizacao', e.target.value)}
                      className="w-full px-3 py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
                      placeholder="Endereço do empreendimento"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-ink-base mb-1">Cidade</label>
                      <input
                        type="text"
                        value={reportInfo.imovel.cidade || ''}
                        onChange={(e) => handleInputChange('imovel', 'cidade', e.target.value)}
                        className="w-full px-3 py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
                        placeholder="Cidade"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink-base mb-1">Estado</label>
                      <select
                        value={reportInfo.imovel.estado || ''}
                        onChange={(e) => handleInputChange('imovel', 'estado', e.target.value)}
                        className="w-full px-3 py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
                      >
                        <option value="">UF</option>
                        {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-base mb-1">
                      Informações Gerais
                    </label>
                    <textarea
                      value={reportInfo.imovel.informacoesGerais}
                      onChange={(e) => handleInputChange('imovel', 'informacoesGerais', e.target.value.slice(0, 256))}
                      maxLength={256}
                      className="w-full px-3 py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
                      rows="3"
                      placeholder="Detalhes adicionais do empreendimento (máx. 256 caracteres)"
                    />
                    <p className="text-xs text-ink-faint mt-1 text-right">
                      {reportInfo.imovel.informacoesGerais.length}/256
                    </p>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Save size={14} />}
                    onClick={handleSalvarImovel}
                    disabled={!reportInfo.imovel.nome || !reportInfo.imovel.localizacao || imovelSalvo}
                  >
                    {imovelSalvo ? 'Empreendimento salvo' : 'Salvar empreendimento'}
                  </Button>
                </div>
              </div>

              {/* Apartamento Section — específico desta proposta, não é salvo */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-ink-base mb-3 border-b border-surface-border pb-2">Dados do Apartamento</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-base mb-1">
                      Unidade / Apartamento <span className="text-ink-faint font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={reportInfo.imovel.unidade || ''}
                      onChange={(e) => handleInputChange('imovel', 'unidade', e.target.value)}
                      className="w-full px-3 py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
                      placeholder="Ex: Apto 102, Bloco B"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-base mb-1">
                      Metragem (m²)
                    </label>
                    <input
                      type="text"
                      value={reportInfo.imovel.metragem}
                      onChange={(e) => handleInputChange('imovel', 'metragem', formatMetragem(e.target.value))}
                      className="w-full px-3 py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
                      placeholder="Ex: 85.50"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  icon={<FileDown size={16} />}
                  onClick={handleModalSubmit}
                >
                  Gerar Relatório
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes do cálculo dos índices */}
      <MetricDetailModal
        metric={metricDetail}
        fipezapMatch={calculatorInputs?.fipezapMatch}
        onClose={() => setMetricDetail(null)}
      />
    </div>
  );
}
