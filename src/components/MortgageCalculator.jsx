import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calculator, X, AlertCircle, AlertTriangle, ChevronLeft, ChevronRight, Sparkles, RotateCcw, Plus, HelpCircle, TrendingUp, Check, Zap } from 'lucide-react';
import { useFipeZap } from '../hooks/useFipeZap';
import { Breadcrumb, Button, Card, Modal } from './ui';
import Logo from './Logo';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function ScrollableChipRow({ children }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const onResize = () => updateScrollState();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateScrollState, children]);

  const scrollBy = (direction) => {
    scrollRef.current?.scrollBy({ left: direction * 160, behavior: 'smooth' });
  };

  const arrowClass = 'flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-ink-muted hover:text-ink-base hover:border-gray-400 transition-all';

  return (
    <div className="flex items-center gap-1 pb-2">
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="Rolar para esquerda"
        tabIndex={canScrollLeft ? 0 : -1}
        className={`${arrowClass} ${canScrollLeft ? '' : 'hidden'}`}
      >
        <ChevronLeft size={16} />
      </button>
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex-1 min-w-0 flex gap-2 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="Rolar para direita"
        tabIndex={canScrollRight ? 0 : -1}
        className={`${arrowClass} ${canScrollRight ? '' : 'hidden'}`}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function HelpPopover({ text, label = 'Ajuda da seção' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        aria-label={label}
        aria-expanded={open}
        className="w-7 h-7 rounded-full flex items-center justify-center text-ink-faint hover:text-brand-600 hover:bg-brand-50 transition-colors"
      >
        <HelpCircle size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-64 sm:w-72 bg-white border border-surface-border rounded-lg shadow-lg p-3 text-xs text-ink-muted leading-relaxed">
          {text}
        </div>
      )}
    </div>
  );
}

export default function MortgageCalculator() {
  const navigate = useNavigate();
  const location = useLocation();
  const inputsAnteriores = location.state?.calculatorInputs;

  const [valorImovel, setValorImovel] = useState(inputsAnteriores?.valorImovel || '');
  const [valorImovelFormatado, setValorImovelFormatado] = useState(inputsAnteriores?.valorImovelFormatado || '');
  const initEntregaDate = useMemo(() => {
    if (!inputsAnteriores?.dataEntrega) return null;
    const d = new Date(inputsAnteriores.dataEntrega + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }, [inputsAnteriores?.dataEntrega]);
  const [entregaMes, setEntregaMes] = useState(initEntregaDate ? initEntregaDate.getMonth() + 1 : null);
  const [entregaAno, setEntregaAno] = useState(initEntregaDate ? initEntregaDate.getFullYear() : null);

  const dataEntrega = useMemo(() => {
    if (!entregaMes || !entregaAno) return '';
    const lastDay = new Date(entregaAno, entregaMes, 0).getDate();
    const mm = String(entregaMes).padStart(2, '0');
    const dd = String(lastDay).padStart(2, '0');
    return `${entregaAno}-${mm}-${dd}`;
  }, [entregaMes, entregaAno]);

  const entregaYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => currentYear + i);
  }, []);

  const isMonthDisabled = useCallback((year, month) => {
    if (!year) return false;
    const lastDay = new Date(year, month, 0).getDate();
    const candidate = new Date(year, month - 1, lastDay);
    const minDate = new Date();
    minDate.setMonth(minDate.getMonth() + 6);
    return candidate < minDate;
  }, []);

  const [percEntrada, setPercEntrada] = useState(inputsAnteriores?.percEntrada || '');
  const [percAteEntrega, setPercAteEntrega] = useState(inputsAnteriores?.percAteEntrega || '');
  const [valorMensal, setValorMensal] = useState(inputsAnteriores?.valorMensal || '');
  const [valorMensalFormatado, setValorMensalFormatado] = useState(inputsAnteriores?.valorMensalFormatado || '');
  const [temIntercaladas, setTemIntercaladas] = useState(inputsAnteriores?.temIntercaladas ?? true);
  const [tipoIntercalada, setTipoIntercalada] = useState(inputsAnteriores?.tipoIntercalada || 'semestral');
  const [valorIntercalada, setValorIntercalada] = useState(inputsAnteriores?.valorIntercalada || '');
  const [valorIntercaladaFormatado, setValorIntercaladaFormatado] = useState(inputsAnteriores?.valorIntercaladaFormatado || '');
  const [proporcaoMensais, setProporcaoMensais] = useState(inputsAnteriores?.proporcaoMensais ?? 50);
  const [incrementoEntrada, setIncrementoEntrada] = useState(inputsAnteriores?.incrementoEntrada || '5');
  const [erros, setErros] = useState({});
  const [incrementoAberto, setIncrementoAberto] = useState(false);


  // Distribuição customizada por porcentagens - combinações dinâmicas (1 a 3)
  const COMBO_DEFAULT = { percEntrada: '', percParcelas: '', percIntercaladas: '' };
  const MAX_COMBINACOES = 3;
  const [distribuicaoCustomizada, setDistribuicaoCustomizada] = useState(inputsAnteriores?.distribuicaoCustomizada || false);
  const [combinacoesCustom, setCombinacoesCustom] = useState(
    inputsAnteriores?.combinacoesCustom || [{ ...COMBO_DEFAULT }]
  );
  const [tipoIntercaladaCustom, setTipoIntercaladaCustom] = useState(inputsAnteriores?.tipoIntercaladaCustom || 'semestral');
  const [mesclarEscalonavel, setMesclarEscalonavel] = useState(inputsAnteriores?.mesclarEscalonavel || false);

  const updateCombinacao = (index, field, value) => {
    setCombinacoesCustom(prev => prev.map((combo, i) =>
      i === index ? { ...combo, [field]: value } : combo
    ));
  };

  const adicionarCombinacao = () => {
    if (combinacoesCustom.length < MAX_COMBINACOES) {
      setCombinacoesCustom(prev => [...prev, { ...COMBO_DEFAULT }]);
    }
  };

  const removerCombinacao = (index) => {
    if (combinacoesCustom.length > 1) {
      setCombinacoesCustom(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Dados do relatório — apenas imóvel (corretor foi movido para tela de resultados)
  const [reportInfo, setReportInfo] = useState(() => {
    if (inputsAnteriores?.reportInfo) return inputsAnteriores.reportInfo;
    return {
      corretor: { nome: '', creci: '', contato: '' },
      imovel: { nome: '', localizacao: '', metragem: '', cidade: '', estado: '', informacoesGerais: '' }
    };
  });
  const [customizacaoAberta, setCustomizacaoAberta] = useState(false);
  const [modoMensal, setModoMensal] = useState(
    // Default 'definir' — se retomando simulação anterior onde valorMensal era 0, respeita 'auto'
    inputsAnteriores && (parseFloat(inputsAnteriores?.valorMensal) || 0) === 0 ? 'auto' : 'definir'
  );
  const [modoIntercalada, setModoIntercalada] = useState(
    (parseFloat(inputsAnteriores?.valorIntercalada) || 0) > 0 ? 'definir' : 'auto'
  );
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [suggestionsData, setSuggestionsData] = useState(null);
  const [tentouCalcular, setTentouCalcular] = useState(false);
  const [formulaHelpOpen, setFormulaHelpOpen] = useState(false);
  const [camposIncompletosModal, setCamposIncompletosModal] = useState({ open: false, campos: [] });

  const BRAZILIAN_STATES = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

  const {
    matched: fipezapMatched,
    currentPrice: fipezapPrice,
    suggestions: fipezapSuggestions,
    neighborhoods,
    selectedNeighborhood,
    setSelectedNeighborhood,
    fipezapMatch,
  } = useFipeZap(reportInfo.imovel.cidade, reportInfo.imovel.estado, dataEntrega, valorImovel, inputsAnteriores?.selectedNeighborhood || '');

  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const handleReportInputChange = (section, field, value) => {
    setReportInfo(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const limparRelatorio = () => {
    setReportInfo({
      corretor: { nome: '', creci: '', contato: '' },
      imovel: { nome: '', localizacao: '', metragem: '', cidade: '', estado: '', informacoesGerais: '' }
    });
  };

  const formatMetragemInput = (value) => {
    let cleaned = value.replace(/[^\d,.]/g, '');
    cleaned = cleaned.replace(',', '.');
    return cleaned;
  };

  // Limpar o state da navegação após restaurar os inputs
  useEffect(() => {
    if (inputsAnteriores) {
      window.history.replaceState({}, '');
    }
  }, []);

  const ErrorPopup = ({ mensagem, onClose }) => {
    if (!mensagem) return null;
    return (
      <div className="absolute z-10 mt-1 w-full bg-red-50 border border-red-300 rounded-lg p-3 shadow-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 flex-1">{mensagem}</p>
          <button onClick={onClose} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const validarCampos = () => {
    const novosErros = {};
    const valor = parseFloat(valorImovel) || 0;
    const entradaMinima = parseFloat(percEntrada);
    const ateEntrega = parseFloat(percAteEntrega);
    const mensal = parseFloat(valorMensal) || 0;
    const intercaladaDesejada = parseFloat(valorIntercalada) || 0;

    if (!valorImovel || valor <= 0) {
      novosErros.valorImovel = 'O valor do imóvel é obrigatório e deve ser maior que zero.';
    }

    if (!dataEntrega) {
      novosErros.dataEntrega = 'A data de entrega é obrigatória.';
    } else {
      const meses = calcularMesesAteEntrega(dataEntrega);
      if (meses < 6) {
        novosErros.dataEntrega = 'A data de entrega deve ser no mínimo 6 meses a partir de hoje.';
      }
    }

    // Validações da distribuição customizada - combinações dinâmicas
    if (distribuicaoCustomizada) {
      combinacoesCustom.forEach((combo, i) => {
        const num = i + 1;
        const percEC = parseFloat(combo.percEntrada) || 0;
        const percPC = parseFloat(combo.percParcelas) || 0;
        const percIC = parseFloat(combo.percIntercaladas) || 0;
        const soma = percEC + percPC + percIC;

        if (percEC < 0) {
          novosErros[`combo${i}_percEntrada`] = `Combinação ${num}: entrada não pode ser negativa.`;
        }
        if (percPC < 0) {
          novosErros[`combo${i}_percParcelas`] = `Combinação ${num}: parcelas não pode ser negativa.`;
        }
        if (percIC < 0) {
          novosErros[`combo${i}_percIntercaladas`] = `Combinação ${num}: intercaladas não pode ser negativa.`;
        }
        if (soma > 100) {
          novosErros[`combo${i}_percEntrada`] = `Combinação ${num}: soma (${soma.toFixed(1)}%) ultrapassa 100%.`;
        }
        if (percEC <= 0 && !novosErros[`combo${i}_percEntrada`]) {
          novosErros[`combo${i}_percEntrada`] = `Combinação ${num}: entrada deve ser maior que zero.`;
        }
      });

      // Validar combinações duplicadas
      for (let i = 0; i < combinacoesCustom.length; i++) {
        for (let j = i + 1; j < combinacoesCustom.length; j++) {
          const a = combinacoesCustom[i];
          const b = combinacoesCustom[j];
          if ((parseFloat(a.percEntrada) || 0) === (parseFloat(b.percEntrada) || 0) &&
              (parseFloat(a.percParcelas) || 0) === (parseFloat(b.percParcelas) || 0) &&
              (parseFloat(a.percIntercaladas) || 0) === (parseFloat(b.percIntercaladas) || 0)) {
            novosErros[`combo${j}_percEntrada`] = `Combinação ${j + 1} é idêntica à Combinação ${i + 1}.`;
          }
        }
      }
    } else {
      // Validações do modo padrão
      if (percAteEntrega === '' || isNaN(ateEntrega)) {
        novosErros.percAteEntrega = 'O percentual a pagar até a entrega é obrigatório.';
      } else if (ateEntrega <= 0 || ateEntrega > 100) {
        novosErros.percAteEntrega = 'O percentual deve estar entre 1% e 100%.';
      }

      if (percEntrada === '' || isNaN(entradaMinima)) {
        novosErros.percEntrada = 'O percentual mínimo de entrada é obrigatório.';
      } else if (entradaMinima < 0 || entradaMinima > 100) {
        novosErros.percEntrada = 'O percentual deve estar entre 0% e 100%.';
      } else if (entradaMinima > ateEntrega) {
        novosErros.percEntrada = 'O percentual mínimo de entrada não pode ser maior que o percentual a pagar até a entrega.';
      }

      {
        const incremento = parseFloat(incrementoEntrada);
        if (!incrementoEntrada || isNaN(incremento) || incremento <= 0 || incremento > 100) {
          novosErros.incrementoEntrada = 'O incremento deve ser um valor entre 1% e 100%.';
        }
      }

      // Campos obrigatórios quando "Definir valor" está ativo no painel de personalização
      if (customizacaoAberta) {
        if (modoMensal === 'definir' && (!valorMensal || mensal <= 0)) {
          novosErros.valorMensal = 'Informe o valor mensal ou mude para "Simular".';
        }
        if (temIntercaladas && modoIntercalada === 'definir' && (!valorIntercalada || intercaladaDesejada <= 0)) {
          novosErros.valorIntercalada = 'Informe o valor intercalado ou mude para "Simular".';
        }
      }

      if (valor > 0 && !isNaN(ateEntrega) && ateEntrega > 0) {
        const valorTotalAteEntrega = (valor * ateEntrega) / 100;
        const mesesAteEntrega = calcularMesesAteEntrega(dataEntrega);
        const valorTotalMensais = mensal * mesesAteEntrega;
        const numIntercaladas = temIntercaladas ? calcularParcelasIntercaladas(mesesAteEntrega, tipoIntercalada) : 0;
        const valorTotalIntercaladas = intercaladaDesejada * numIntercaladas;
        const valorEntradaMinimo = (valor * entradaMinima) / 100;

        if (mensal > 0 && valorTotalMensais > valorTotalAteEntrega) {
          novosErros.valorMensal = `O total das mensalidades (${formatarMoeda(valorTotalMensais)}) excede o valor a pagar até a entrega (${formatarMoeda(valorTotalAteEntrega)}).`;
        }

        if (temIntercaladas && intercaladaDesejada > 0 && valorTotalIntercaladas > valorTotalAteEntrega) {
          novosErros.valorIntercalada = `O total das intercaladas (${formatarMoeda(valorTotalIntercaladas)}) excede o valor a pagar até a entrega (${formatarMoeda(valorTotalAteEntrega)}).`;
        }

        if (mensal > 0 && intercaladaDesejada > 0) {
          const somaTotal = valorEntradaMinimo + valorTotalMensais + valorTotalIntercaladas;
          if (somaTotal > valorTotalAteEntrega) {
            novosErros.valorMensal = `A soma da entrada mínima + mensalidades + intercaladas (${formatarMoeda(somaTotal)}) excede o valor a pagar até a entrega (${formatarMoeda(valorTotalAteEntrega)}).`;
          }
        }

        if (mensal > 0 && !temIntercaladas) {
          const somaTotal = valorEntradaMinimo + valorTotalMensais;
          if (somaTotal > valorTotalAteEntrega) {
            novosErros.valorMensal = `A soma da entrada mínima + mensalidades (${formatarMoeda(somaTotal)}) excede o valor a pagar até a entrega (${formatarMoeda(valorTotalAteEntrega)}).`;
          }
        }
      }
    }

    // Validação de personalizar entrada (também usada no modo customizado)
    if (distribuicaoCustomizada && mesclarEscalonavel) {
      const incremento = parseFloat(incrementoEntrada);
      if (!incrementoEntrada || isNaN(incremento) || incremento <= 0 || incremento > 100) {
        novosErros.incrementoEntrada = 'O incremento deve ser um valor entre 1% e 100%.';
      }
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const limparErro = (campo) => {
    setErros(prev => {
      const novosErros = { ...prev };
      delete novosErros[campo];
      return novosErros;
    });
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarInputMoeda = (valor) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    const numero = parseFloat(apenasNumeros) / 100;

    if (apenasNumeros === '') return '';

    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numero);
  };

  const obterValorNumerico = (valorFormatado) => {
    const numero = valorFormatado
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim();

    return parseFloat(numero) || 0;
  };

  const handleValorImovelChange = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = formatarInputMoeda(valorDigitado);
    setValorImovelFormatado(valorFormatado);
    setValorImovel(obterValorNumerico(valorFormatado).toString());
  };

  const calcularMesesAteEntrega = (dataEntregaStr) => {
    if (!dataEntregaStr) return 0;
    const [anoStr, mesStr] = String(dataEntregaStr).split('-');
    const anoEntrega = parseInt(anoStr, 10);
    const mesEntrega = parseInt(mesStr, 10); // 1-12
    if (!anoEntrega || !mesEntrega) return 0;
    // O mês atual destina-se apenas ao pagamento da entrada — as parcelas
    // começam a contar a partir do mês seguinte. Por isso o prazo é a
    // diferença de meses entre a entrega e o mês corrente.
    const hoje = new Date();
    const diffMeses = (anoEntrega - hoje.getFullYear()) * 12
      + (mesEntrega - (hoje.getMonth() + 1));
    return diffMeses > 0 ? diffMeses : 0;
  };

  const calcularParcelasIntercaladas = (meses, tipo) => {
    const mesesPorParcela = {
      'trimestral': 3,
      'semestral': 6,
      'anual': 12
    };
    return Math.floor(meses / mesesPorParcela[tipo]);
  };

  const gerarValoresAleatorios = () => {
    // 85% multi-scenario, 15% single-scenario (porcentagens mode)
    const isMultiScenario = Math.random() < 0.85;

    // Property value: R$ 300k - R$ 2M
    const valorAleatorio = Math.floor(Math.random() * (2000000 - 300000 + 1)) + 300000;
    const valorFormatado = formatarInputMoeda(valorAleatorio.toString() + '00');
    setValorImovel(obterValorNumerico(valorFormatado).toString());
    setValorImovelFormatado(valorFormatado);

    // Delivery date: 12-48 months in future
    const mesesAleatorios = Math.floor(Math.random() * (48 - 12 + 1)) + 12;
    const dataFutura = new Date();
    dataFutura.setMonth(dataFutura.getMonth() + mesesAleatorios);
    setEntregaMes(dataFutura.getMonth() + 1);
    setEntregaAno(dataFutura.getFullYear());

    // Payment until delivery: minimum 50%, range 50-100%
    const percAteEntregaAleatorio = Math.floor(Math.random() * (100 - 50 + 1)) + 50;
    setPercAteEntrega(percAteEntregaAleatorio.toString());

    if (isMultiScenario) {
      // Escalonável mode — ensure room for multiple scenarios
      setDistribuicaoCustomizada(false);

      // Entry %: low enough to allow many increments (5% to 30% of ateEntrega)
      const maxEntrada = Math.floor(percAteEntregaAleatorio * 0.3);
      const percEntradaAleatorio = Math.floor(Math.random() * (Math.max(maxEntrada, 10) - 5 + 1)) + 5;
      setPercEntrada(percEntradaAleatorio.toString());

      // Increment: ensures multiple results
      const incremento = Math.floor(Math.random() * 3) + 3; // 3-5%
      setIncrementoEntrada(incremento.toString());

      // Monthly value: 50% chance of auto-distribution
      if (Math.random() > 0.5) {
        const mensalAleatorio = Math.floor(Math.random() * (5000 - 800 + 1)) + 800;
        const mensalFormatado = formatarInputMoeda(mensalAleatorio.toString() + '00');
        setValorMensal(obterValorNumerico(mensalFormatado).toString());
        setValorMensalFormatado(mensalFormatado);
      } else {
        setValorMensal('');
        setValorMensalFormatado('');
      }

      // Intercaladas: 60% chance
      const ativarIntercaladas = Math.random() < 0.6;
      setTemIntercaladas(ativarIntercaladas);

      if (ativarIntercaladas) {
        const tipos = ['trimestral', 'semestral', 'anual'];
        setTipoIntercalada(tipos[Math.floor(Math.random() * tipos.length)]);
        if (Math.random() > 0.5) {
          const intercaladaAleatoria = Math.floor(Math.random() * (15000 - 3000 + 1)) + 3000;
          const intercaladaFormatada = formatarInputMoeda(intercaladaAleatoria.toString() + '00');
          setValorIntercalada(obterValorNumerico(intercaladaFormatada).toString());
          setValorIntercaladaFormatado(intercaladaFormatada);
        } else {
          setValorIntercalada('');
          setValorIntercaladaFormatado('');
        }
      } else {
        setTipoIntercalada('semestral');
        setValorIntercalada('');
        setValorIntercaladaFormatado('');
      }

      setCombinacoesCustom([{ ...COMBO_DEFAULT }]);
      setTipoIntercaladaCustom('semestral');
      setMesclarEscalonavel(false);
    } else {
      // Porcentagens mode — single or few fixed scenarios
      setDistribuicaoCustomizada(true);
      const numCombos = Math.floor(Math.random() * 3) + 1; // 1-3
      const combos = [];
      for (let i = 0; i < numCombos; i++) {
        const pEntrada = Math.floor(Math.random() * (30 - 10 + 1)) + 10;
        const remaining = percAteEntregaAleatorio - pEntrada;
        const pParcelas = Math.floor(Math.random() * (remaining - 1)) + 1;
        const pIntercaladas = remaining - pParcelas;
        combos.push({
          percEntrada: pEntrada.toString(),
          percParcelas: pParcelas.toString(),
          percIntercaladas: pIntercaladas > 0 ? pIntercaladas.toString() : ''
        });
      }
      setCombinacoesCustom(combos);
      const tipos = ['trimestral', 'semestral', 'anual'];
      setTipoIntercaladaCustom(tipos[Math.floor(Math.random() * tipos.length)]);
      setMesclarEscalonavel(false);

      setPercEntrada('');
      setValorMensal('');
      setValorMensalFormatado('');
      setTemIntercaladas(false);
      setTipoIntercalada('semestral');
      setValorIntercalada('');
      setValorIntercaladaFormatado('');
      setIncrementoEntrada('5');
    }

    // Report info — sample data for testing PDF export
    const nomes = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Lucas Ferreira'];
    const imoveis = ['Residencial Aurora', 'Edifício Solar', 'Condomínio Parque Verde', 'Torres do Atlântico', 'Villa Mediterrânea'];
    const enderecos = ['Rua das Flores, 123', 'Av. Beira Mar, 456', 'Rua do Comércio, 789', 'Av. Principal, 1000'];
    const cidades = ['Maceió', 'Recife', 'Salvador', 'São Paulo', 'Curitiba'];
    const estados = ['AL', 'PE', 'BA', 'SP', 'PR'];
    const cidadeIdx = Math.floor(Math.random() * cidades.length);
    const metragemAleatoria = (Math.floor(Math.random() * (200 - 40 + 1)) + 40).toString();

    setReportInfo({
      corretor: {
        nome: nomes[Math.floor(Math.random() * nomes.length)],
        creci: Math.floor(Math.random() * 90000 + 10000).toString(),
        contato: `(82) 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`
      },
      imovel: {
        nome: imoveis[Math.floor(Math.random() * imoveis.length)],
        localizacao: enderecos[Math.floor(Math.random() * enderecos.length)],
        metragem: metragemAleatoria,
        cidade: cidades[cidadeIdx],
        estado: estados[cidadeIdx],
        informacoesGerais: ''
      }
    });

    // Reset UI states
    setProporcaoMensais(50);
    setCustomizacaoAberta(false);
    setModoMensal('auto');
    setModoIntercalada('auto');
    setIncrementoAberto(false);
    setErros({});
  };

  const limparDados = () => {
    // Simulation fields
    setValorImovel('');
    setValorImovelFormatado('');
    setEntregaMes(null);
    setEntregaAno(null);
    setPercEntrada('');
    setPercAteEntrega('');
    setValorMensal('');
    setValorMensalFormatado('');
    setTemIntercaladas(false);
    setTipoIntercalada('semestral');
    setValorIntercalada('');
    setValorIntercaladaFormatado('');
    setProporcaoMensais(50);
    setCustomizacaoAberta(false);
    setModoMensal('auto');
    setModoIntercalada('auto');
    setIncrementoEntrada('5');
    setIncrementoAberto(false);

    // Custom distribution
    setDistribuicaoCustomizada(false);
    setCombinacoesCustom([{ ...COMBO_DEFAULT }]);
    setTipoIntercaladaCustom('semestral');
    setMesclarEscalonavel(false);

    // Report info (clear imovel, corretor is managed in results screen)
    setReportInfo({
      corretor: { nome: '', creci: '', contato: '' },
      imovel: { nome: '', localizacao: '', metragem: '', cidade: '', estado: '', informacoesGerais: '' }
    });

    // Errors
    setErros({});
  };

  const calcular = () => {
    setTentouCalcular(true);
    if (!validarCampos()) {
      // Auto-scroll to first error
      setTimeout(() => {
        const firstErrorField = document.querySelector('[data-field-error="true"]');
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);

      // Show suggestions modal if overflow error
      const valor = parseFloat(valorImovel) || 0;
      const ateEntrega = parseFloat(percAteEntrega) || 0;
      const entradaMinima = parseFloat(percEntrada) || 0;
      const mensal = parseFloat(valorMensal) || 0;
      const intercaladaDesejada = parseFloat(valorIntercalada) || 0;
      const meses = dataEntrega ? calcularMesesAteEntrega(dataEntrega) : 0;
      const numIntercaladas = temIntercaladas ? calcularParcelasIntercaladas(meses, tipoIntercalada) : 0;

      if (valor > 0 && meses > 0 && (mensal > 0 || intercaladaDesejada > 0)) {
        const disponivel = (valor * (ateEntrega - entradaMinima)) / 100;
        const totalMensais = mensal * meses;
        const totalIntercaladas = intercaladaDesejada * numIntercaladas;
        const totalUsado = totalMensais + totalIntercaladas + ((valor * entradaMinima) / 100);
        const valorAteEntrega = (valor * ateEntrega) / 100;

        if (totalUsado > valorAteEntrega) {
          const maxMensalComIntercalada = numIntercaladas > 0 && intercaladaDesejada > 0
            ? Math.max(0, (disponivel - totalIntercaladas) / meses)
            : null;
          const maxMensalSemIntercalada = Math.max(0, disponivel / meses);
          const percUsado = valor > 0 ? ((totalMensais + totalIntercaladas) / valor) * 100 : 0;
          const percDisponivel = ateEntrega - entradaMinima;

          setSuggestionsData({
            valorImovel: valor,
            disponivel,
            totalMensais,
            totalIntercaladas,
            mensal,
            intercaladaDesejada,
            meses,
            numIntercaladas,
            maxMensalComIntercalada,
            maxMensalSemIntercalada,
            percUsado,
            percDisponivel,
            ateEntrega,
            entradaMinima,
          });
          setShowSuggestionsModal(true);
        }
      }
      return;
    }

    const valor = parseFloat(valorImovel);
    const mesesAteEntrega = calcularMesesAteEntrega(dataEntrega);
    const incremento = parseFloat(incrementoEntrada) || 5;
    // Safety cap — loops break when percEntradaOpcao > ateEntrega, so this only guards against infinite iteration
    const maxSimulacoes = 200;

    const opcoes = [];

    // === MODO: Distribuição customizada por porcentagens (combinações dinâmicas) ===
    if (distribuicaoCustomizada) {
      // Helper para gerar cenário de uma combinação
      const gerarCenario = (combo, label) => {
        const percEC = parseFloat(combo.percEntrada) || 0;
        const percPC = parseFloat(combo.percParcelas) || 0;
        const percIC = parseFloat(combo.percIntercaladas) || 0;
        const somaCombo = percEC + percPC + percIC;
        const saldoCombo = 100 - somaCombo;
        const tipoIntCalc = percIC > 0 ? tipoIntercaladaCustom : 'trimestral';
        const numInterc = percIC > 0 ? calcularParcelasIntercaladas(mesesAteEntrega, tipoIntCalc) : 0;

        const valorEntrada = (valor * percEC) / 100;
        const valorTotalParcelas = (valor * percPC) / 100;
        const valorTotalIntercaladas = (valor * percIC) / 100;
        const valorFinanciamento = (valor * saldoCombo) / 100;
        const valorParcelaMensal = mesesAteEntrega > 0 ? valorTotalParcelas / mesesAteEntrega : 0;
        const valorParcelaIntercalada = numInterc > 0 ? valorTotalIntercaladas / numInterc : 0;

        return {
          tipo: `${percEC.toFixed(1)}% Entrada`,
          comboLabel: label,
          entrada: valorEntrada,
          mensais: percPC > 0 ? {
            quantidade: mesesAteEntrega,
            valorParcela: valorParcelaMensal,
            total: valorTotalParcelas
          } : { quantidade: mesesAteEntrega, valorParcela: 0, total: 0 },
          intercaladas: percIC > 0 && numInterc > 0 ? {
            tipo: tipoIntCalc,
            quantidade: numInterc,
            valorParcela: valorParcelaIntercalada,
            total: valorTotalIntercaladas
          } : null,
          financiamento: valorFinanciamento,
          total: valor
        };
      };

      // Ordenar combinações por % de entrada (menor → maior)
      const combosOrdenadas = combinacoesCustom
        .map((combo, i) => ({ combo, label: `${i + 1}` }))
        .sort((a, b) => (parseFloat(a.combo.percEntrada) || 0) - (parseFloat(b.combo.percEntrada) || 0));

      if (!mesclarEscalonavel) {
        // Gerar cenários fixos (um por combinação)
        combosOrdenadas.forEach(({ combo, label }) => {
          opcoes.push(gerarCenario(combo, label));
        });
      } else {
        // Combinações com menores entradas: cenários fixos
        // Última combinação (maior entrada): gera simulações com incremento
        combosOrdenadas.forEach(({ combo, label }, idx) => {
          if (idx < combosOrdenadas.length - 1) {
            // Cenário fixo
            opcoes.push(gerarCenario(combo, label));
          } else {
            // Última: gerar simulações incrementando entrada
            const percEC = parseFloat(combo.percEntrada) || 0;
            const percPC = parseFloat(combo.percParcelas) || 0;
            const percIC = parseFloat(combo.percIntercaladas) || 0;
            const somaCombo = percEC + percPC + percIC;
            const tipoIntCalc = percIC > 0 ? tipoIntercaladaCustom : 'trimestral';
            const numInterc = percIC > 0 ? calcularParcelasIntercaladas(mesesAteEntrega, tipoIntCalc) : 0;
            const totalPI = percPC + percIC;
            const rP = totalPI > 0 ? percPC / totalPI : 0;
            const rI = totalPI > 0 ? percIC / totalPI : 0;

            for (let i = 0; i < maxSimulacoes; i++) {
              const newPercEntrada = percEC + (i * incremento);
              const restante = somaCombo - newPercEntrada;
              if (restante < 0) break;

              const newPercParcelas = totalPI > 0 ? restante * rP : 0;
              const newPercIntercaladas = totalPI > 0 ? restante * rI : 0;
              const newSaldo = 100 - newPercEntrada - newPercParcelas - newPercIntercaladas;

              const vEntrada = (valor * newPercEntrada) / 100;
              const vParcelas = (valor * newPercParcelas) / 100;
              const vIntercaladas = (valor * newPercIntercaladas) / 100;
              const vFinanc = (valor * newSaldo) / 100;
              const vParcelaMensal = mesesAteEntrega > 0 ? vParcelas / mesesAteEntrega : 0;
              const vParcelaInterc = numInterc > 0 ? vIntercaladas / numInterc : 0;

              opcoes.push({
                tipo: `${newPercEntrada.toFixed(1)}% Entrada`,
                comboLabel: label,
                entrada: vEntrada,
                mensais: newPercParcelas > 0 ? {
                  quantidade: mesesAteEntrega,
                  valorParcela: vParcelaMensal,
                  total: vParcelas
                } : { quantidade: mesesAteEntrega, valorParcela: 0, total: 0 },
                intercaladas: newPercIntercaladas > 0 && numInterc > 0 ? {
                  tipo: tipoIntCalc,
                  quantidade: numInterc,
                  valorParcela: vParcelaInterc,
                  total: vIntercaladas
                } : null,
                financiamento: vFinanc,
                total: valor
              });
            }
          }
        });
      }

      // Usar primeira combinação como referência para valores globais
      const firstCombo = combinacoesCustom[0];
      const percEC0 = parseFloat(firstCombo.percEntrada) || 0;
      const percPC0 = parseFloat(firstCombo.percParcelas) || 0;
      const percIC0 = parseFloat(firstCombo.percIntercaladas) || 0;
      const soma0 = percEC0 + percPC0 + percIC0;

      navigate('/calculadora/resultados', {
        state: {
          resultados: {
            mesesAteEntrega,
            valorTotalAteEntrega: (valor * soma0) / 100,
            valorRestante: (valor * soma0) / 100,
            valorTotalMensais: (valor * percPC0) / 100,
            valorTotalIntercaladas: (valor * percIC0) / 100,
            valorEntradaMinimo: (valor * percEC0) / 100,
            opcoes,
            tipoDistribuicao: 'customizado',
            combinacoesCustom
          },
          calculatorInputs: {
            valorImovel,
            valorImovelFormatado,
            dataEntrega,
            percEntrada,
            percAteEntrega,
            valorMensal,
            valorMensalFormatado,
            temIntercaladas,
            tipoIntercalada,
            valorIntercalada,
            valorIntercaladaFormatado,
            proporcaoMensais,
            incrementoEntrada,
            distribuicaoCustomizada,
            combinacoesCustom,
            tipoIntercaladaCustom,
            mesclarEscalonavel,
            reportInfo,
            selectedNeighborhood,
            fipezapMatch
          }
        }
      });
      return;
    }

    // === MODO: Cálculo padrão (existente) ===
    const entradaMinima = parseFloat(percEntrada);
    const ateEntrega = parseFloat(percAteEntrega);
    const mensal = parseFloat(valorMensal) || 0;
    const intercaladaDesejada = parseFloat(valorIntercalada) || 0;

    const valorEntradaMinimo = (valor * entradaMinima) / 100;
    const valorTotalAteEntrega = (valor * ateEntrega) / 100;
    const valorFinanciamento = valor - valorTotalAteEntrega;
    const valorTotalMensais = mensal * mesesAteEntrega;
    const numIntercaladas = temIntercaladas ? calcularParcelasIntercaladas(mesesAteEntrega, tipoIntercalada) : 0;
    const valorTotalIntercaladas = intercaladaDesejada * numIntercaladas;

    if (!temIntercaladas && mensal > 0) {
      const valorEntradaTotal = valorTotalAteEntrega - valorTotalMensais;

      opcoes.push({
        tipo: 'Entrada Única',
        entrada: valorEntradaTotal,
        mensais: {
          quantidade: mesesAteEntrega,
          valorParcela: mensal,
          total: valorTotalMensais
        },
        intercaladas: null,
        financiamento: valorFinanciamento,
        total: valor
      });
    }
    else if (!temIntercaladas && mensal === 0) {
      for (let i = 0; i < maxSimulacoes; i++) {
        const percEntradaOpcao = entradaMinima + (i * incremento);

        if (percEntradaOpcao > ateEntrega) break;

        const valorEntradaTotal = (valor * percEntradaOpcao) / 100;
        const valorMensaisRestante = valorTotalAteEntrega - valorEntradaTotal;

        if (valorMensaisRestante < 0) break;

        const valorParcelaMensal = valorMensaisRestante / mesesAteEntrega;

        opcoes.push({
          tipo: `${percEntradaOpcao.toFixed(1)}% Entrada`,
          entrada: valorEntradaTotal,
          mensais: {
            quantidade: mesesAteEntrega,
            valorParcela: valorParcelaMensal,
            total: valorMensaisRestante
          },
          intercaladas: null,
          financiamento: valorFinanciamento,
          total: valor
        });
      }
    }
    else if (intercaladaDesejada > 0 && mensal > 0) {
      const valorEntradaTotal = valorTotalAteEntrega - valorTotalMensais - valorTotalIntercaladas;
      const percEntradaCalculado = (valorEntradaTotal / valor) * 100;

      opcoes.push({
        tipo: `${percEntradaCalculado.toFixed(0)}% Entrada`,
        entrada: valorEntradaTotal,
        mensais: {
          quantidade: mesesAteEntrega,
          valorParcela: mensal,
          total: valorTotalMensais
        },
        intercaladas: {
          tipo: tipoIntercalada,
          quantidade: numIntercaladas,
          valorParcela: intercaladaDesejada,
          total: valorTotalIntercaladas
        },
        financiamento: valorFinanciamento,
        total: valor
      });
    }
    else if (intercaladaDesejada > 0 && mensal === 0) {
      for (let i = 0; i < maxSimulacoes; i++) {
        const percEntradaOpcao = entradaMinima + (i * incremento);

        if (percEntradaOpcao > ateEntrega) break;

        const valorEntradaTotal = (valor * percEntradaOpcao) / 100;
        const valorMensaisRestante = valorTotalAteEntrega - valorEntradaTotal - valorTotalIntercaladas;

        if (valorMensaisRestante < 0) break;

        const valorParcelaMensal = valorMensaisRestante / mesesAteEntrega;

        opcoes.push({
          tipo: `${percEntradaOpcao.toFixed(1)}% Entrada`,
          entrada: valorEntradaTotal,
          mensais: {
            quantidade: mesesAteEntrega,
            valorParcela: valorParcelaMensal,
            total: valorMensaisRestante
          },
          intercaladas: {
            tipo: tipoIntercalada,
            quantidade: numIntercaladas,
            valorParcela: intercaladaDesejada,
            total: valorTotalIntercaladas
          },
          financiamento: valorFinanciamento,
          total: valor
        });
      }
    }
    else if (intercaladaDesejada === 0 && mensal > 0 && temIntercaladas) {
      for (let i = 0; i < maxSimulacoes; i++) {
        const percEntradaOpcao = entradaMinima + (i * incremento);

        if (percEntradaOpcao > ateEntrega) break;

        const valorEntradaTotal = (valor * percEntradaOpcao) / 100;
        const valorIntercaladas = valorTotalAteEntrega - valorEntradaTotal - valorTotalMensais;

        if (valorIntercaladas < 0) break;

        if (numIntercaladas > 0 && valorIntercaladas > 0) {
          const valorParcelaIntercalada = valorIntercaladas / numIntercaladas;

          opcoes.push({
            tipo: `${percEntradaOpcao.toFixed(1)}% Entrada`,
            entrada: valorEntradaTotal,
            mensais: {
              quantidade: mesesAteEntrega,
              valorParcela: mensal,
              total: valorTotalMensais
            },
            intercaladas: {
              tipo: tipoIntercalada,
              quantidade: numIntercaladas,
              valorParcela: valorParcelaIntercalada,
              total: valorIntercaladas
            },
            financiamento: valorFinanciamento,
            total: valor
          });
        }
      }
    }
    else if (intercaladaDesejada === 0 && mensal === 0 && temIntercaladas) {
      for (let i = 0; i < maxSimulacoes; i++) {
        const percEntradaOpcao = entradaMinima + (i * incremento);

        if (percEntradaOpcao > ateEntrega) break;

        const valorEntradaTotal = (valor * percEntradaOpcao) / 100;
        const valorParaDistribuir = valorTotalAteEntrega - valorEntradaTotal;

        if (valorParaDistribuir < 0) break;

        const valorMensaisOpcao = valorParaDistribuir * (proporcaoMensais / 100);
        const valorIntercaladasOpcao = valorParaDistribuir * ((100 - proporcaoMensais) / 100);

        const valorParcelaMensal = valorMensaisOpcao / mesesAteEntrega;
        const valorParcelaIntercalada = numIntercaladas > 0 ? valorIntercaladasOpcao / numIntercaladas : 0;

        opcoes.push({
          tipo: `${percEntradaOpcao.toFixed(1)}% Entrada`,
          entrada: valorEntradaTotal,
          mensais: {
            quantidade: mesesAteEntrega,
            valorParcela: valorParcelaMensal,
            total: valorMensaisOpcao
          },
          intercaladas: numIntercaladas > 0 ? {
            tipo: tipoIntercalada,
            quantidade: numIntercaladas,
            valorParcela: valorParcelaIntercalada,
            total: valorIntercaladasOpcao
          } : null,
          financiamento: valorFinanciamento,
          total: valor
        });
      }
    }

    let tipoDistribuicao = 'entrada';
    let valorRestante = valorTotalAteEntrega;

    if (!temIntercaladas && mensal === 0) {
      tipoDistribuicao = 'mensais';
    } else if (temIntercaladas && intercaladaDesejada > 0 && mensal === 0) {
      tipoDistribuicao = 'mensais';
      valorRestante = valorTotalAteEntrega - valorTotalIntercaladas;
    } else if (temIntercaladas && intercaladaDesejada === 0 && mensal > 0) {
      tipoDistribuicao = 'intercaladas';
      valorRestante = valorTotalAteEntrega - valorTotalMensais;
    } else if (temIntercaladas && intercaladaDesejada === 0 && mensal === 0) {
      tipoDistribuicao = 'todos';
    } else if (!temIntercaladas && mensal > 0) {
      valorRestante = valorTotalAteEntrega - valorTotalMensais;
    } else if (temIntercaladas && intercaladaDesejada > 0 && mensal > 0) {
      valorRestante = valorTotalAteEntrega - valorTotalMensais - valorTotalIntercaladas;
    }

    navigate('/calculadora/resultados', {
      state: {
        resultados: {
          mesesAteEntrega,
          valorTotalAteEntrega,
          valorRestante,
          valorTotalMensais,
          valorTotalIntercaladas,
          valorEntradaMinimo,
          opcoes,
          tipoDistribuicao
        },
        calculatorInputs: {
          valorImovel,
          valorImovelFormatado,
          dataEntrega,
          percEntrada,
          percAteEntrega,
          valorMensal,
          valorMensalFormatado,
          temIntercaladas,
          tipoIntercalada,
          valorIntercalada,
          valorIntercaladaFormatado,
          proporcaoMensais,
          incrementoEntrada,
          distribuicaoCustomizada,
          combinacoesCustom,
          tipoIntercaladaCustom,
          mesclarEscalonavel,
          reportInfo,
          fipezapMatch
        }
      }
    });
  };

  // Computed distribution bar values (usa primeira combinação como referência)
  const distribuicao = useMemo(() => {
    if (distribuicaoCustomizada) {
      const combo = combinacoesCustom[0];
      const percEC = parseFloat(combo.percEntrada) || 0;
      const percPC = parseFloat(combo.percParcelas) || 0;
      const percIC = parseFloat(combo.percIntercaladas) || 0;
      const soma = percEC + percPC + percIC;
      if (soma <= 0) return null;
      const saldo = 100 - soma;
      return {
        entrada: percEC,
        parcelas: percPC,
        intercaladas: percIC,
        financiamento: saldo > 0 ? saldo : 0,
        isCustom: true
      };
    }
    const entrada = parseFloat(percEntrada) || 0;
    const ateEntrega = parseFloat(percAteEntrega) || 0;
    if (ateEntrega <= 0) return null;
    const totalParcelas = ateEntrega - entrada;
    const financiamento = 100 - ateEntrega;

    // Quando entrada >= ateEntrega, não há espaço para parcelas
    if (totalParcelas <= 0) {
      // Clampar entrada para não ultrapassar ateEntrega na barra visual
      const entradaDisplay = Math.min(entrada, ateEntrega);
      return {
        entrada: entradaDisplay,
        parcelas: 0,
        financiamento,
        isCustom: false,
        aviso: entrada > ateEntrega
          ? 'Entrada mínima deve ser menor que Pagar até Entrega para distribuir parcelas'
          : (temIntercaladas ? 'Entrada igual a Pagar até Entrega — sem espaço para parcelas/intercaladas' : null)
      };
    }

    if (temIntercaladas) {
      const valor = parseFloat(valorImovel) || 0;
      const meses = dataEntrega ? calcularMesesAteEntrega(dataEntrega) : 0;
      const mensal = parseFloat(valorMensal) || 0;
      const intercalada = parseFloat(valorIntercalada) || 0;

      const temValorMonetario = valor > 0 && meses > 0 && (mensal > 0 || intercalada > 0);

      if (temValorMonetario) {
        const totalMensais = mensal > 0 ? (mensal * meses) : 0;
        const numIntercaladas = calcularParcelasIntercaladas(meses, tipoIntercalada);
        const totalIntercaladas = intercalada > 0 ? (intercalada * numIntercaladas) : 0;

        const percMensaisReal = (totalMensais / valor) * 100;
        const percIntercaladasReal = (totalIntercaladas / valor) * 100;
        const percUsado = percMensaisReal + percIntercaladasReal;
        const percEntradaReal = totalParcelas - percUsado;

        // Tolerância de 0.01% para absorver erros de ponto flutuante
        const excede = percUsado > totalParcelas + 0.01;

        if (mensal > 0 && intercalada > 0) {
          return {
            entrada: Math.max(0, entrada + percEntradaReal),
            parcelas: percMensaisReal,
            intercaladas: percIntercaladasReal,
            financiamento,
            isCustom: true,
            aviso: excede
              ? `Os valores informados (mensais + intercaladas) ultrapassam o limite de ${totalParcelas.toFixed(1)}% disponível para parcelas`
              : null,
            excede
          };
        }

        if (mensal > 0) {
          const restante = totalParcelas - percMensaisReal;
          return {
            entrada: Math.max(0, entrada + Math.min(0, restante)),
            parcelas: percMensaisReal,
            intercaladas: restante > 0 ? restante : 0,
            financiamento,
            isCustom: true,
            aviso: percMensaisReal > totalParcelas
              ? `O valor mensal informado ultrapassa o limite disponível para parcelas`
              : null,
            excede: percMensaisReal > totalParcelas
          };
        }

        if (intercalada > 0) {
          const restante = totalParcelas - percIntercaladasReal;
          return {
            entrada: Math.max(0, entrada + Math.min(0, restante)),
            parcelas: restante > 0 ? restante : 0,
            intercaladas: percIntercaladasReal,
            financiamento,
            isCustom: true,
            aviso: percIntercaladasReal > totalParcelas
              ? `O valor da parcela intercalada informado ultrapassa o limite disponível para parcelas`
              : null,
            excede: percIntercaladasReal > totalParcelas
          };
        }
      }

      const percMensais = totalParcelas * (proporcaoMensais / 100);
      const percIntercaladas = totalParcelas * ((100 - proporcaoMensais) / 100);
      return {
        entrada,
        parcelas: percMensais > 0 ? percMensais : 0,
        intercaladas: percIntercaladas > 0 ? percIntercaladas : 0,
        financiamento,
        isCustom: true
      };
    }

    // Modo sem intercaladas mas com valor mensal
    if (!temIntercaladas) {
      const valor = parseFloat(valorImovel) || 0;
      const meses = dataEntrega ? calcularMesesAteEntrega(dataEntrega) : 0;
      const mensal = parseFloat(valorMensal) || 0;

      if (valor > 0 && meses > 0 && mensal > 0) {
        const totalMensais = mensal * meses;
        const percMensaisReal = (totalMensais / valor) * 100;
        const percEntradaReal = totalParcelas - percMensaisReal;

        return {
          entrada: Math.max(0, entrada + percEntradaReal),
          parcelas: percMensaisReal,
          financiamento,
          isCustom: false,
          aviso: percMensaisReal > totalParcelas
            ? `O valor mensal informado ultrapassa o limite disponível para parcelas`
            : null,
          excede: percMensaisReal > totalParcelas
        };
      }
    }

    return { entrada, parcelas: totalParcelas, financiamento, isCustom: false };
  }, [percEntrada, percAteEntrega, distribuicaoCustomizada, combinacoesCustom, temIntercaladas, proporcaoMensais, valorImovel, valorMensal, valorIntercalada, dataEntrega, tipoIntercalada]);

  // Computed simulation summary
  const resumoSimulacao = useMemo(() => {
    const valor = parseFloat(valorImovel) || 0;

    if (distribuicaoCustomizada) {
      // Verificar se todas as combinações têm entrada > 0
      const todasValidas = combinacoesCustom.every(c => (parseFloat(c.percEntrada) || 0) > 0);
      if (valor <= 0 || !todasValidas) return null;

      // Ordenar por entrada para determinar última (maior entrada)
      const combosOrdenadas = combinacoesCustom
        .map((combo, i) => ({
          percEC: parseFloat(combo.percEntrada) || 0,
          percPC: parseFloat(combo.percParcelas) || 0,
          percIC: parseFloat(combo.percIntercaladas) || 0,
          label: `${i + 1}`
        }))
        .sort((a, b) => a.percEC - b.percEC);

      const ultimaCombo = combosOrdenadas[combosOrdenadas.length - 1];
      const somaUltima = ultimaCombo.percEC + ultimaCombo.percPC + ultimaCombo.percIC;

      const numCombos = combinacoesCustom.length;

      if (!mesclarEscalonavel) {
        return {
          valor,
          ateEntrega: somaUltima,
          numSim: numCombos,
          entradaMin: combosOrdenadas[0].percEC,
          entradaFinal: ultimaCombo.percEC,
          incremento: 0,
          isCustom: true,
          naoSimular: true,
          combosLabels: combosOrdenadas.map(c => `${c.percEC.toFixed(0)}%`)
        };
      }

      const inc = parseFloat(incrementoEntrada) || 5;
      const entradaFinal = somaUltima;
      const numSim = inc > 0 ? Math.floor((somaUltima - ultimaCombo.percEC) / inc) + 1 : 1;
      const comboFixas = combosOrdenadas.slice(0, -1);

      return {
        valor,
        ateEntrega: somaUltima,
        numSim: numSim + comboFixas.length,
        entradaMin: combosOrdenadas[0].percEC,
        entradaFinal,
        incremento: inc,
        isCustom: true,
        naoSimular: false,
        comboFixas,
        comboSimulada: ultimaCombo
      };
    }

    const ateEntrega = parseFloat(percAteEntrega) || 0;
    const entradaMin = parseFloat(percEntrada) || 0;
    const inc = parseFloat(incrementoEntrada) || 5;

    if (valor <= 0 || ateEntrega <= 0) return null;

    // Count matches generator loop exactly: iterate incrementing entrada until it exceeds ateEntrega
    let numSim = 0;
    let lastValidPerc = entradaMin;
    if (inc > 0) {
      for (let i = 0; i < 200; i++) {
        const perc = entradaMin + i * inc;
        if (perc > ateEntrega) break;
        numSim++;
        lastValidPerc = perc;
      }
    } else {
      numSim = 1;
      lastValidPerc = entradaMin;
    }

    return {
      valor,
      ateEntrega,
      numSim,
      entradaMin,
      entradaFinal: lastValidPerc,
      incremento: inc,
    };
  }, [valorImovel, percAteEntrega, percEntrada, incrementoEntrada, distribuicaoCustomizada, combinacoesCustom, mesclarEscalonavel]);

  // Soma dos percentuais customizados (array dinâmico)
  const somasPercentuaisCustom = useMemo(() => {
    return combinacoesCustom.map(combo => {
      const percEC = parseFloat(combo.percEntrada) || 0;
      const percPC = parseFloat(combo.percParcelas) || 0;
      const percIC = parseFloat(combo.percIntercaladas) || 0;
      return percEC + percPC + percIC;
    });
  }, [combinacoesCustom]);

  // Computed R$ values for percentage fields
  const valorEntradaCalculado = useMemo(() => {
    const valor = parseFloat(valorImovel) || 0;
    const perc = parseFloat(percEntrada) || 0;
    return valor > 0 && perc > 0 ? formatarMoeda((valor * perc) / 100) : null;
  }, [valorImovel, percEntrada]);

  const valorAteEntregaCalculado = useMemo(() => {
    const valor = parseFloat(valorImovel) || 0;
    const perc = parseFloat(percAteEntrega) || 0;
    return valor > 0 && perc > 0 ? formatarMoeda((valor * perc) / 100) : null;
  }, [valorImovel, percAteEntrega]);

  // Limites máximos de Mensal e Intercalada para guiar o usuário antes de digitar valores inválidos
  const limitesParcelas = useMemo(() => {
    const valor = parseFloat(valorImovel) || 0;
    const entradaPerc = parseFloat(percEntrada);
    const atePerc = parseFloat(percAteEntrega);
    const meses = dataEntrega ? calcularMesesAteEntrega(dataEntrega) : 0;
    const numInterc = temIntercaladas ? calcularParcelasIntercaladas(meses, tipoIntercalada) : 0;

    if (valor <= 0 || isNaN(entradaPerc) || isNaN(atePerc) || atePerc <= entradaPerc || meses <= 0) {
      return null;
    }

    const valorImovelTotal = valor;
    const valorAteEntrega = (valor * atePerc) / 100;
    const valorEntrada = (valor * entradaPerc) / 100;
    const valorDisponivel = (valor * (atePerc - entradaPerc)) / 100;

    // Consideração para o máximo: se o OUTRO campo está em "Definir valor" com valor, subtrai ele
    const mensalValor = parseFloat(valorMensal) || 0;
    const intercValor = parseFloat(valorIntercalada) || 0;

    const totalMensaisCurrent = modoMensal === 'definir' && mensalValor > 0 ? mensalValor * meses : 0;
    const totalIntercCurrent = modoIntercalada === 'definir' && intercValor > 0 && numInterc > 0 ? intercValor * numInterc : 0;

    const maxMensal = meses > 0 ? Math.max(0, (valorDisponivel - totalIntercCurrent) / meses) : 0;
    const maxIntercalada = numInterc > 0 ? Math.max(0, (valorDisponivel - totalMensaisCurrent) / numInterc) : 0;

    return {
      valorImovelTotal,
      valorAteEntrega,
      valorEntrada,
      valorDisponivel,
      atePerc,
      entradaPerc,
      percDisponivel: atePerc - entradaPerc,
      meses,
      numInterc,
      maxMensal,
      maxIntercalada,
      totalMensaisCurrent,
      totalIntercCurrent,
    };
  }, [valorImovel, percEntrada, percAteEntrega, dataEntrega, tipoIntercalada, temIntercaladas, valorMensal, valorIntercalada, modoMensal, modoIntercalada]);

  const inputBase = 'w-full py-2.5 border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors';
  const inputNormal = `${inputBase} border-surface-border`;
  const inputError = `${inputBase} border-red-500 bg-red-50`;

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Logo */}
        <div className="mb-5 sm:mb-8">
          <Logo size="lg" to="/" />
        </div>

        {/* Breadcrumb + Gerar valores — mesma linha, botão ao final */}
        <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
          <Breadcrumb items={[
            { label: 'Inicio', href: '/' },
            { label: 'Calculadora' },
          ]} />
          <Button
            variant="secondary"
            size="sm"
            icon={<Sparkles size={14} />}
            onClick={gerarValoresAleatorios}
          >
            Gerar valores de teste
          </Button>
        </div>

        {/* Card Principal: Localização + Simulação */}
        <Card variant="outlined" padding="lg" className="mb-4 sm:mb-6">
          {/* Cabeçalho: Localização */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl">📍</span>
              <h2 className="text-lg font-semibold text-ink-base">Localização</h2>
            </div>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              fipezapMatched
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            }`}>
              <TrendingUp size={12} />
              {fipezapMatched
                ? <>FipeZap+ · R$ {fipezapPrice?.toLocaleString('pt-BR')}/m²</>
                : <>FipeZap+ disponível</>}
            </span>
          </div>

          <div className="mb-6 pb-6 border-b border-surface-border">
            <div className="grid grid-cols-3 gap-3">
              <select
                value={reportInfo.imovel.estado}
                onChange={(e) => {
                  handleReportInputChange('imovel', 'estado', e.target.value);
                  // Limpa cidade ao trocar UF — evita combinação inválida (ex: cidade de AL + UF BA)
                  if (reportInfo.imovel.cidade) {
                    handleReportInputChange('imovel', 'cidade', '');
                  }
                }}
                className="w-full px-3 py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
              >
                <option value="">UF</option>
                {BRAZILIAN_STATES.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
              <div className="col-span-2 relative">
                <input
                  type="text"
                  value={reportInfo.imovel.cidade}
                  onChange={(e) => {
                    handleReportInputChange('imovel', 'cidade', e.target.value);
                    setShowCitySuggestions(true);
                  }}
                  onFocus={() => setShowCitySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                  className={`w-full pl-3 ${reportInfo.imovel.cidade ? 'pr-10' : 'pr-3'} py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors`}
                  placeholder="Cidade"
                  autoComplete="off"
                />
                {reportInfo.imovel.cidade && (
                  <button
                    type="button"
                    onClick={() => handleReportInputChange('imovel', 'cidade', '')}
                    aria-label="Limpar cidade"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors p-1"
                  >
                    <X size={14} />
                  </button>
                )}
                {showCitySuggestions && !fipezapMatched && fipezapSuggestions.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-white border border-surface-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {fipezapSuggestions.map(city => (
                      <li
                        key={city}
                        className="px-3 py-2 cursor-pointer hover:bg-brand-50 text-sm flex items-center gap-2"
                        onMouseDown={() => {
                          handleReportInputChange('imovel', 'cidade', city);
                          setShowCitySuggestions(false);
                        }}
                      >
                        <TrendingUp size={14} className="text-emerald-500" />
                        {city} <span className="text-ink-faint text-xs">— dados FipeZap+ disponíveis</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {fipezapMatched && neighborhoods.length > 0 && (
              <select
                value={selectedNeighborhood}
                onChange={(e) => setSelectedNeighborhood(e.target.value)}
                className="w-full mt-3 px-3 py-2.5 border border-surface-border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
              >
                <option value="">Bairro (opcional) — usa a média da cidade</option>
                {neighborhoods.map((h) => (
                  <option key={h.n} value={h.n}>{h.n} — R$ {h.p.toLocaleString('pt-BR')}/m²</option>
                ))}
              </select>
            )}
          </div>

          {/* Cabeçalho: Simulação */}
          <div className="flex items-start justify-between gap-2 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl">📐</span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-ink-base">Simulação</h2>
                <p className="text-sm text-ink-faint">Valores e condições de pagamento</p>
              </div>
            </div>
            <HelpPopover text="Informe o valor do imóvel e a data de entrega prevista. A metragem é opcional e usada para calcular o preço por m². O valor do imóvel deve ser o preço cheio do lançamento." />
          </div>

          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            <div className="relative" data-field="valorImovel" data-field-error={!!erros.valorImovel || undefined}>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-sm font-medium text-ink-base">Valor do Imóvel (R$)</label>
                <span className="text-[9px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wide">Obrigatório</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint font-medium">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={valorImovelFormatado}
                  onChange={(e) => {
                    handleValorImovelChange(e);
                    limparErro('valorImovel');
                  }}
                  placeholder="500.000,00"
                  className={`${erros.valorImovel ? inputError : inputNormal} pl-10 pr-10`}
                />
                {valorImovelFormatado && (
                  <button
                    type="button"
                    onClick={() => { setValorImovel(''); setValorImovelFormatado(''); limparErro('valorImovel'); }}
                    aria-label="Limpar valor do imóvel"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <ErrorPopup mensagem={erros.valorImovel} onClose={() => limparErro('valorImovel')} />
            </div>

          </div>

          {/* Entrega — Ano + Mês */}
          <div className="mt-4 sm:mt-6 relative" data-field="dataEntrega" data-field-error={!!erros.dataEntrega || undefined}>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium text-ink-base">Ano de entrega</label>
              <span className="text-[9px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wide">Obrigatório</span>
            </div>
            <ScrollableChipRow>
              {entregaYears.map(year => (
                <button
                  key={year}
                  type="button"
                  onClick={() => { setEntregaAno(year); limparErro('dataEntrega'); }}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    entregaAno === year
                      ? 'bg-slate-800 text-white border border-transparent'
                      : 'border border-gray-200 bg-gray-50 text-ink-muted hover:border-gray-400'
                  }`}
                >
                  {year}
                </button>
              ))}
            </ScrollableChipRow>

            <div className="flex items-center gap-2 mb-2 mt-4">
              <label className="text-sm font-medium text-ink-base">Mês de entrega</label>
              <span className="text-[9px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wide">Obrigatório</span>
            </div>
            <ScrollableChipRow>
              {MONTH_LABELS.map((label, i) => {
                const month = i + 1;
                const disabled = isMonthDisabled(entregaAno, month);
                return (
                  <button
                    key={month}
                    type="button"
                    disabled={disabled}
                    onClick={() => { setEntregaMes(month); limparErro('dataEntrega'); }}
                    className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                      disabled
                        ? 'border border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                        : entregaMes === month
                          ? 'bg-slate-800 text-white border border-transparent'
                          : 'border border-gray-200 bg-gray-50 text-ink-muted hover:border-gray-400'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </ScrollableChipRow>

            {entregaMes && entregaAno && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-ink-faint">Selecionado:</span>
                <span className="text-sm font-semibold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                  {MONTH_LABELS[entregaMes - 1]} / {entregaAno}
                </span>
              </div>
            )}

            {!entregaMes || !entregaAno ? (
              <p className="text-xs text-ink-faint mt-2">Mínimo 6 meses no futuro</p>
            ) : null}

            <ErrorPopup mensagem={erros.dataEntrega} onClose={() => limparErro('dataEntrega')} />
          </div>

          {/* Metragem — opcional, full width */}
          <div className="mt-4 sm:mt-6">
            <label className="block text-sm font-medium text-ink-base mb-1.5">
              Metragem (m²)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={reportInfo.imovel.metragem}
                onChange={(e) => handleReportInputChange('imovel', 'metragem', formatMetragemInput(e.target.value))}
                className={`${inputNormal} pl-4 pr-10`}
                placeholder="Ex: 85.50"
              />
              {reportInfo.imovel.metragem && (
                <button
                  type="button"
                  onClick={() => handleReportInputChange('imovel', 'metragem', '')}
                  aria-label="Limpar metragem"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <p className="text-xs text-ink-faint mt-1">Opcional — usado para calcular o preço por m²</p>
          </div>

          {/* Separador */}
          <hr className="border-surface-border my-5 sm:my-8" />

          {/* Seção 2: Condições de Pagamento */}
          <div className="flex items-start justify-between gap-2 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl">🤝</span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-ink-base">Condições de Pagamento</h2>
                <p className="text-sm text-ink-faint">Como o pagamento será distribuído</p>
              </div>
            </div>
            <HelpPopover text="Escolha entre Escalonável (gera vários cenários incrementando a entrada) ou Porcentagens (define até 3 combinações fixas para comparar). Use Personalizar para ajustar manualmente mensais e intercaladas." />
          </div>

          {/* Segmented Control: Escalonável | Porcentagens */}
          <label className="block text-sm font-medium text-ink-base mb-2">Tipo de Simulação</label>
          <div className="flex bg-surface-muted rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setDistribuicaoCustomizada(false);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-semibold transition-all duration-200 ${
                !distribuicaoCustomizada
                  ? 'bg-white text-brand-600 shadow-sm ring-1 ring-black/5'
                  : 'text-ink-faint hover:text-ink-base'
              }`}
            >
              <span className="text-base">🔺</span>
              Escalonável
            </button>
            <button
              type="button"
              onClick={() => {
                setDistribuicaoCustomizada(true);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-semibold transition-all duration-200 ${
                distribuicaoCustomizada
                  ? 'bg-white text-brand-600 shadow-sm ring-1 ring-black/5'
                  : 'text-ink-faint hover:text-ink-base'
              }`}
            >
              <span className="text-base">📊</span>
              Porcentagens
            </button>
          </div>

          {distribuicaoCustomizada ? (
            /* === Modo: Distribuição por porcentagens (combinações dinâmicas) === */
            <div className="space-y-4">
              <p className="text-xs text-ink-faint">Defina combinações de entrada, parcelas e intercaladas para comparar estratégias de pagamento</p>

              {/* Switch: Com simulação Escalonável */}
              <div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={mesclarEscalonavel}
                  onClick={() => setMesclarEscalonavel(!mesclarEscalonavel)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${mesclarEscalonavel ? 'bg-brand-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${mesclarEscalonavel ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-sm font-semibold text-ink-base">Com simulação Escalonável</span>
                </button>
                <p className="text-xs text-ink-faint mt-1.5">A partir das combinações escolhidas, será aplicada a simulação escalonável, incrementando a porcentagem da entrada</p>
              </div>

              {/* Blocos de Combinação dinâmicos */}
              {combinacoesCustom.map((_, i) => {
                return (
                <div key={i} className="border border-surface-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-ink-base">Combinação {i + 1}</p>
                    {combinacoesCustom.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerCombinacao(i)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors p-1"
                        title={`Remover Combinação ${i + 1}`}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="relative">
                      <label className="block text-xs font-medium text-ink-faint mb-1">Entrada (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={combinacoesCustom[i].percEntrada}
                          onChange={(e) => {
                            updateCombinacao(i, 'percEntrada', e.target.value);
                            limparErro(`combo${i}_percEntrada`);
                          }}
                          placeholder="30"
                          min="0"
                          max="100"
                          step="0.5"
                          className={`${erros[`combo${i}_percEntrada`] ? inputError : inputNormal} pl-4 pr-10`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint font-medium">%</span>
                      </div>
                      <ErrorPopup mensagem={erros[`combo${i}_percEntrada`]} onClose={() => limparErro(`combo${i}_percEntrada`)} />
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-medium text-ink-faint mb-1">Parcelas (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={combinacoesCustom[i].percParcelas}
                          onChange={(e) => {
                            updateCombinacao(i, 'percParcelas', e.target.value);
                            limparErro(`combo${i}_percParcelas`);
                          }}
                          placeholder="20"
                          min="0"
                          max="100"
                          step="0.5"
                          className={`${erros[`combo${i}_percParcelas`] ? inputError : inputNormal} pl-4 pr-10`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint font-medium">%</span>
                      </div>
                      <ErrorPopup mensagem={erros[`combo${i}_percParcelas`]} onClose={() => limparErro(`combo${i}_percParcelas`)} />
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-medium text-ink-faint mb-1">Intercaladas (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={combinacoesCustom[i].percIntercaladas}
                          onChange={(e) => {
                            updateCombinacao(i, 'percIntercaladas', e.target.value);
                            limparErro(`combo${i}_percIntercaladas`);
                          }}
                          placeholder="50"
                          min="0"
                          max="100"
                          step="0.5"
                          className={`${erros[`combo${i}_percIntercaladas`] ? inputError : inputNormal} pl-4 pr-10`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint font-medium">%</span>
                      </div>
                      <ErrorPopup mensagem={erros[`combo${i}_percIntercaladas`]} onClose={() => limparErro(`combo${i}_percIntercaladas`)} />
                    </div>
                  </div>
                  {/* Soma e Saldo inline */}
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="text-ink-faint">Soma: <span className={`font-semibold ${somasPercentuaisCustom[i] > 100 ? 'text-red-500' : 'text-ink-base'}`}>{somasPercentuaisCustom[i].toFixed(1)}%</span></span>
                    <span className="text-ink-faint">Saldo: <span className={`font-semibold ${(100 - somasPercentuaisCustom[i]) < 0 ? 'text-red-500' : 'text-ink-base'}`}>{(100 - somasPercentuaisCustom[i]).toFixed(1)}%</span></span>
                  </div>
                </div>
                );
              })}

              {/* Botão adicionar combinação */}
              {combinacoesCustom.length < MAX_COMBINACOES && (
                <button
                  type="button"
                  onClick={adicionarCombinacao}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-surface-border rounded-lg text-sm font-medium text-ink-faint hover:border-brand-300 hover:text-brand-500 transition-colors"
                >
                  <Plus size={16} />
                  Adicionar Combinação
                </button>
              )}

              {/* Frequência das intercaladas (aparece quando QUALQUER combinação tiver intercaladas > 0) */}
              {combinacoesCustom.some(c => (parseFloat(c.percIntercaladas) || 0) > 0) && (
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-ink-base mb-1.5">
                    Frequência das Intercaladas
                  </label>
                  <select
                    value={tipoIntercaladaCustom}
                    onChange={(e) => setTipoIntercaladaCustom(e.target.value)}
                    className={`${inputNormal} px-4`}
                  >
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              )}

            </div>
          ) : (
            /* === Modo: Pagar até Entrega + Entrada Mínima === */
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <div className="relative" data-field="percAteEntrega" data-field-error={!!erros.percAteEntrega || undefined}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-sm font-medium text-ink-base">Pagar até a Entrega (%)</label>
                    <span className="text-[9px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wide">Obrigatório</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={percAteEntrega}
                      onChange={(e) => {
                        setPercAteEntrega(e.target.value);
                        limparErro('percAteEntrega');
                      }}
                      placeholder="30"
                      min="0"
                      max="100"
                      className={`${erros.percAteEntrega ? inputError : inputNormal} pl-4 ${percAteEntrega !== '' ? 'pr-16' : 'pr-10'}`}
                    />
                    {percAteEntrega !== '' && (
                      <button
                        type="button"
                        onClick={() => { setPercAteEntrega(''); limparErro('percAteEntrega'); }}
                        aria-label="Limpar pagar até a entrega"
                        className="absolute right-8 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors p-1"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint font-medium">%</span>
                  </div>
                  {valorAteEntregaCalculado && (
                    <p className="text-xs text-brand-500 font-medium mt-1">= {valorAteEntregaCalculado}</p>
                  )}
                  <ErrorPopup mensagem={erros.percAteEntrega} onClose={() => limparErro('percAteEntrega')} />
                </div>

                <div className="relative" data-field="percEntrada" data-field-error={!!erros.percEntrada || undefined}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-sm font-medium text-ink-base">Entrada Mínima (%)</label>
                    <span className="text-[9px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wide">Obrigatório</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={percEntrada}
                      onChange={(e) => {
                        setPercEntrada(e.target.value);
                        limparErro('percEntrada');
                      }}
                      placeholder="10"
                      min="0"
                      max="100"
                      className={`${erros.percEntrada ? inputError : inputNormal} pl-4 ${percEntrada !== '' ? 'pr-16' : 'pr-10'}`}
                    />
                    {percEntrada !== '' && (
                      <button
                        type="button"
                        onClick={() => { setPercEntrada(''); limparErro('percEntrada'); }}
                        aria-label="Limpar entrada mínima"
                        className="absolute right-8 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors p-1"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint font-medium">%</span>
                  </div>
                  {valorEntradaCalculado && (
                    <p className="text-xs text-brand-500 font-medium mt-1">= {valorEntradaCalculado}</p>
                  )}
                  <ErrorPopup mensagem={erros.percEntrada} onClose={() => limparErro('percEntrada')} />
                </div>
              </div>

              {/* Toggle intercaladas + Frequência — ANTES do box */}
              <div className="flex items-center gap-3 py-1 mt-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={temIntercaladas}
                  onClick={() => {
                    const next = !temIntercaladas;
                    setTemIntercaladas(next);
                    if (!next) {
                      setValorIntercalada('');
                      setValorIntercaladaFormatado('');
                    }
                  }}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${temIntercaladas ? 'bg-brand-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${temIntercaladas ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-sm font-semibold text-ink-base">Contém intercaladas</span>
                </button>
              </div>

              {temIntercaladas && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-ink-base mb-1.5">
                    Frequência
                  </label>
                  <select
                    value={tipoIntercalada}
                    onChange={(e) => setTipoIntercalada(e.target.value)}
                    className={`${inputNormal} px-4`}
                  >
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              )}

              {/* Distribuição do pagamento — movido para cá (antes estava ao final) */}
              {distribuicao && (
                <div className="mt-4">
                  {(() => {
                    const fmtPerc = (v) => {
                      const r = Math.round(v * 10) / 10;
                      return Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1).replace('.', ',');
                    };

                    const segments = [
                      distribuicao.entrada > 0 && { label: 'Entrada', value: distribuicao.entrada, color: 'bg-brand-500', textColor: 'text-brand-500', dotColor: 'bg-brand-500' },
                      distribuicao.parcelas > 0 && { label: 'Mensais', value: distribuicao.parcelas, color: 'bg-blue-500', textColor: 'text-blue-500', dotColor: 'bg-blue-500' },
                      (distribuicao.isCustom && distribuicao.intercaladas > 0) && { label: 'Intercaladas', value: distribuicao.intercaladas, color: 'bg-amber-400', textColor: 'text-amber-400', dotColor: 'bg-amber-400' },
                      distribuicao.financiamento > 0 && { label: 'Saldo', value: distribuicao.financiamento, color: 'bg-slate-400', textColor: 'text-slate-500', dotColor: 'bg-slate-400' },
                    ].filter(Boolean);

                    return (
                      <>
                        <p className="text-sm text-ink-faint mb-3">Distribuição do pagamento</p>
                        <div className="space-y-2">
                          {segments.map((seg) => (
                            <div key={seg.label} className="flex items-center gap-3">
                              <span className="text-xs text-ink-muted w-20 text-right flex-shrink-0">{seg.label}</span>
                              <div className="flex-1 bg-surface-muted rounded-full h-5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${seg.color} transition-all duration-300`}
                                  style={{ width: `${seg.value}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-ink-base w-10 flex-shrink-0">{fmtPerc(seg.value)}%</span>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                  {distribuicao.aviso && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
                      <AlertTriangle size={13} className="flex-shrink-0" />
                      {distribuicao.aviso}
                    </p>
                  )}

                  {/* Resumo da simulação inline */}
                  {resumoSimulacao && (
                    <p className="text-xs text-ink-muted mt-3">
                      {resumoSimulacao.isCustom && resumoSimulacao.naoSimular ? (
                        <><strong className="text-ink-base">{resumoSimulacao.numSim} {resumoSimulacao.numSim === 1 ? 'cenário fixo' : 'cenários fixos'}</strong> · entradas de {resumoSimulacao.combosLabels?.join(', ')}</>
                      ) : resumoSimulacao.isCustom && !resumoSimulacao.naoSimular ? (
                        <><strong className="text-ink-base">{resumoSimulacao.numSim} cenários</strong> · {resumoSimulacao.comboFixas?.length} {resumoSimulacao.comboFixas?.length === 1 ? 'fixo' : 'fixos'} + simulações de {resumoSimulacao.comboSimulada?.percEC}% a {resumoSimulacao.entradaFinal.toFixed(1)}%</>
                      ) : (
                        <><strong className="text-ink-base">{resumoSimulacao.numSim} simulações</strong> · entrada de {resumoSimulacao.entradaMin}% a {resumoSimulacao.entradaFinal.toFixed(1)}% · incremento {resumoSimulacao.incremento}%</>
                      )}
                    </p>
                  )}

                  {/* Customizar incremento — colapsável */}
                  <div className="mt-2">
                    {!incrementoAberto ? (
                      <button
                        type="button"
                        onClick={() => setIncrementoAberto(true)}
                        className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors inline-flex items-center gap-1"
                      >
                        Customizar incremento
                        <span aria-hidden>→</span>
                      </button>
                    ) : (
                      <>
                        <hr className="border-surface-border mt-4 mb-4" />
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink-base">Incremento de entrada</p>
                              <p className="text-xs text-ink-faint mt-0.5 leading-relaxed">
                                De quanto em quanto % a entrada aumenta entre simulações.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setIncrementoEntrada('5');
                                limparErro('incrementoEntrada');
                                setIncrementoAberto(false);
                              }}
                              className="flex-shrink-0 text-ink-faint hover:text-ink-base transition-colors p-1 -m-1"
                              aria-label="Fechar e restaurar incremento padrão"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 5, 10, 15].map((v) => {
                              const isActive = parseFloat(incrementoEntrada) === v;
                              return (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => {
                                    setIncrementoEntrada(String(v));
                                    limparErro('incrementoEntrada');
                                  }}
                                  aria-pressed={isActive}
                                  className={`min-h-[36px] px-4 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                                    isActive
                                      ? 'bg-brand-500 text-white border-brand-500'
                                      : 'bg-white text-ink-muted border-surface-border hover:border-brand-300 hover:text-ink-base'
                                  }`}
                                >
                                  {v}%
                                </button>
                              );
                            })}
                          </div>
                          <ErrorPopup mensagem={erros.incrementoEntrada} onClose={() => limparErro('incrementoEntrada')} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Simulação automática (default) vs Personalizar distribuição (reveal com tabs) */}
              {!customizacaoAberta ? (
                <div className="mt-4 rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-500/10 flex items-center justify-center">
                      <Sparkles size={18} className="text-brand-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink-base">Simulação automática ativada</p>
                      <p className="text-xs text-ink-faint mt-0.5 leading-relaxed">
                        Vamos calcular a melhor distribuição de mensais e intercaladas com base no orçamento disponível.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const camposFaltando = [];
                          const errosNovos = {};

                          const valor = parseFloat(valorImovel);
                          if (!valorImovel || isNaN(valor) || valor <= 0) {
                            camposFaltando.push({ label: 'Valor do Imóvel', field: 'valorImovel' });
                            errosNovos.valorImovel = 'Campo obrigatório para personalizar.';
                          }

                          if (!dataEntrega) {
                            camposFaltando.push({ label: 'Ano e Mês de entrega', field: 'dataEntrega' });
                            errosNovos.dataEntrega = 'Campo obrigatório para personalizar.';
                          }

                          const ate = parseFloat(percAteEntrega);
                          if (percAteEntrega === '' || isNaN(ate) || ate <= 0 || ate > 100) {
                            camposFaltando.push({ label: 'Pagar até a Entrega (%)', field: 'percAteEntrega' });
                            errosNovos.percAteEntrega = 'Campo obrigatório para personalizar.';
                          }

                          const ent = parseFloat(percEntrada);
                          if (percEntrada === '' || isNaN(ent) || ent < 0 || ent > 100) {
                            camposFaltando.push({ label: 'Entrada Mínima (%)', field: 'percEntrada' });
                            errosNovos.percEntrada = 'Campo obrigatório para personalizar.';
                          }

                          if (camposFaltando.length > 0) {
                            setErros(e => ({ ...e, ...errosNovos }));
                            setCamposIncompletosModal({ open: true, campos: camposFaltando });
                            return;
                          }

                          setCustomizacaoAberta(true);
                          // Ao abrir a personalização, "Definir valor" das
                          // mensais já vem habilitado (em vez de "Simular").
                          setModoMensal('definir');
                        }}
                        className="mt-2 text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors inline-flex items-center gap-1"
                      >
                        Quero personalizar
                        <span aria-hidden>→</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <hr className="border-surface-border mt-4 mb-4" />
                  <div>
                    {/* Header — mesmo padrão de Incremento de entrada */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-base">Personalizar distribuição</p>
                        <p className="text-xs text-ink-faint mt-0.5 leading-relaxed">
                          Ajuste manualmente como o pagamento até a entrega será distribuído.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomizacaoAberta(false);
                          setValorMensal('');
                          setValorMensalFormatado('');
                          setValorIntercalada('');
                          setValorIntercaladaFormatado('');
                          setProporcaoMensais(50);
                          setModoMensal('auto');
                          setModoIntercalada('auto');
                          limparErro('valorMensal');
                          limparErro('valorIntercalada');
                        }}
                        aria-label="Fechar e voltar para automática"
                        title="Voltar para automática"
                        className="flex-shrink-0 text-ink-faint hover:text-ink-base transition-colors p-1 -m-1"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Content */}
                    <div>
                    {/* Mini Gauge — orçamento disponível em tempo real (contexto para ambas as tabs) */}
                    {(() => {
                      if (!distribuicao || !distribuicao.isCustom) return null;
                      const valor = parseFloat(valorImovel) || 0;
                      if (valor <= 0) return null;

                      const ateEntregaVal = parseFloat(percAteEntrega) || 0;
                      const entradaVal = parseFloat(percEntrada) || 0;
                      const percDisponivel = ateEntregaVal - entradaVal;
                      if (percDisponivel <= 0) return null;

                      const percMensais = distribuicao.parcelas || 0;
                      const percIntercaladas = distribuicao.intercaladas || 0;
                      const percUsado = percMensais + percIntercaladas;
                      // Tolerância de 0.01% para absorver erros de ponto flutuante
                      // (ex: 10% + 50% = 59.99999999... devido a divisões fracionárias)
                      const excede = percUsado > percDisponivel + 0.01;

                      const valorMensaisTotal = (valor * percMensais) / 100;
                      const valorIntercaladasTotal = (valor * percIntercaladas) / 100;
                      const valorDisponivel = (valor * percDisponivel) / 100;
                      const valorUsado = valorMensaisTotal + valorIntercaladasTotal;

                      const barMensais = percDisponivel > 0 ? (percMensais / percDisponivel) * 100 : 0;
                      const barIntercaladas = percDisponivel > 0 ? (percIntercaladas / percDisponivel) * 100 : 0;

                      const fmtPerc = (v) => {
                        const r = Math.round(v * 10) / 10;
                        return Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1).replace('.', ',');
                      };

                      return (
                        <div className={`rounded-lg p-3 mb-4 ${excede ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`}>
                          <div className="mb-2">
                            <div className="text-[11px] text-slate-500 flex items-start gap-1.5">
                              <span>Disponível para personalização de parcelas mensais e intercaladas</span>
                              <button
                                type="button"
                                onClick={() => setFormulaHelpOpen(v => !v)}
                                aria-label="Explicação da fórmula"
                                aria-expanded={formulaHelpOpen}
                                className="flex-shrink-0 mt-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                <HelpCircle size={12} />
                              </button>
                            </div>
                            {formulaHelpOpen && (
                              <div className="mt-1.5 text-[10px] text-slate-600 bg-white border border-slate-200 rounded px-2 py-1.5">
                                Percentual até a entrega menos a entrada é o valor disponível para distribuir em parcelas mensais e intercaladas.
                              </div>
                            )}
                          </div>
                          <div className="text-[11px] grid grid-cols-[1rem_1fr_auto] gap-x-2 items-center mb-3">
                            <span aria-hidden="true"></span>
                            <span className="text-slate-600">{fmtPerc(ateEntregaVal)}% Entrega</span>
                            <span className="text-slate-600 tabular-nums">{formatarMoeda((valor * ateEntregaVal) / 100)}</span>

                            <span className="text-slate-500" aria-hidden="true">−</span>
                            <span className="text-slate-600">{fmtPerc(entradaVal)}% Entrada</span>
                            <span className="text-slate-600 tabular-nums">{formatarMoeda((valor * entradaVal) / 100)}</span>

                            <span className="col-span-3 border-t border-slate-300 my-1"></span>

                            <span aria-hidden="true"></span>
                            <span className={`font-semibold ${excede ? 'text-red-600' : 'text-emerald-700'}`}>{fmtPerc(percDisponivel)}% Disponível</span>
                            <span className={`font-semibold tabular-nums ${excede ? 'text-red-600' : 'text-emerald-700'}`}>{formatarMoeda(valorDisponivel)}</span>
                          </div>
                          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div className="absolute inset-0 flex">
                              {percMensais > 0 && (
                                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${Math.min(barMensais, 100)}%` }} />
                              )}
                              {percIntercaladas > 0 && (
                                <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${Math.min(barIntercaladas, excede ? 100 - Math.min(barMensais, 100) : 100)}%` }} />
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            {percMensais > 0 && (
                              <span className="text-[10px] text-slate-600 flex items-center gap-1">
                                <span className="w-2 h-2 bg-blue-500 rounded-sm inline-block flex-shrink-0"></span>
                                Mensais: {formatarMoeda(valorMensaisTotal)}
                              </span>
                            )}
                            {percIntercaladas > 0 && (
                              <span className="text-[10px] text-slate-600 flex items-center gap-1">
                                <span className="w-2 h-2 bg-amber-500 rounded-sm inline-block flex-shrink-0"></span>
                                Intercaladas: {formatarMoeda(valorIntercaladasTotal)}
                              </span>
                            )}
                            {!excede && valorDisponivel - valorUsado > 0 && (
                              <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                                <span className="w-2 h-2 bg-emerald-400 rounded-sm inline-block flex-shrink-0"></span>
                                Livre: {formatarMoeda(valorDisponivel - valorUsado)}
                              </span>
                            )}
                            {excede && (
                              <span className="text-[10px] text-red-600 font-semibold flex items-center gap-1">
                                <span className="w-2 h-2 bg-red-500 rounded-sm inline-block flex-shrink-0"></span>
                                Excedente: {formatarMoeda(valorUsado - valorDisponivel)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Distribuição por valores (R$) */}
                    {(() => {
                        const valor = parseFloat(valorImovel) || 0;
                        const meses = dataEntrega ? calcularMesesAteEntrega(dataEntrega) : 0;
                        const numInter = temIntercaladas ? calcularParcelasIntercaladas(meses, tipoIntercalada) : 0;
                        const ateEntregaVal = parseFloat(percAteEntrega) || 0;
                        const entradaVal = parseFloat(percEntrada) || 0;
                        const percDisp = ateEntregaVal - entradaVal;

                        // Edge cases — dados insuficientes
                        if (valor <= 0 || meses <= 0 || percDisp <= 0) {
                          return (
                            <p className="text-xs text-ink-faint leading-relaxed">
                              Preencha <span className="font-semibold text-ink-base">Valor do imóvel</span>, <span className="font-semibold text-ink-base">Data de entrega</span> e os percentuais acima para liberar os controles.
                            </p>
                          );
                        }

                        const handleMensalInput = (e) => {
                          const valorFormatado = formatarInputMoeda(e.target.value);
                          setValorMensalFormatado(valorFormatado);
                          setValorMensal(obterValorNumerico(valorFormatado).toString());
                          limparErro('valorMensal');
                        };

                        const handleIntercaladaInput = (e) => {
                          const valorFormatado = formatarInputMoeda(e.target.value);
                          setValorIntercaladaFormatado(valorFormatado);
                          setValorIntercalada(obterValorNumerico(valorFormatado).toString());
                          limparErro('valorIntercalada');
                        };

                        return (
                          <div className="space-y-5">
                            <p className="text-xs text-ink-faint leading-relaxed">
                              Defina o valor de cada tipo de parcela. Deixe em <span className="font-semibold text-ink-base">Simular</span> para calcular com base no orçamento restante.
                            </p>

                            {/* Mensais */}
                            <div data-field="valorMensal">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-sm flex-shrink-0"></div>
                                <label className="text-sm font-medium text-ink-base">
                                  Valor de <span className="font-bold">Mensais</span>
                                </label>
                              </div>

                              {/* Toggle Definir / Automático */}
                              <div className="inline-flex rounded-lg border border-surface-border overflow-hidden mb-2 w-full sm:w-auto" role="radiogroup" aria-label="Modo do valor mensal">
                                <button
                                  type="button"
                                  role="radio"
                                  aria-checked={modoMensal === 'definir'}
                                  onClick={() => setModoMensal('definir')}
                                  className={`flex-1 sm:flex-initial min-h-[40px] px-4 py-1.5 text-xs font-semibold transition-colors ${
                                    modoMensal === 'definir'
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-white text-ink-faint hover:text-ink-base'
                                  }`}
                                >
                                  Definir valor
                                </button>
                                <button
                                  type="button"
                                  role="radio"
                                  aria-checked={modoMensal === 'auto'}
                                  onClick={() => {
                                    setModoMensal('auto');
                                    setValorMensal('');
                                    setValorMensalFormatado('');
                                    limparErro('valorMensal');
                                  }}
                                  className={`flex-1 sm:flex-initial min-h-[40px] px-4 py-1.5 text-xs font-semibold transition-colors border-l border-surface-border ${
                                    modoMensal === 'auto'
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-white text-ink-faint hover:text-ink-base'
                                  }`}
                                >
                                  Simular
                                </button>
                              </div>

                              {modoMensal === 'definir' ? (
                                <>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint font-medium">R$</span>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={valorMensalFormatado}
                                      onChange={handleMensalInput}
                                      placeholder="2.000,00"
                                      className={`${erros.valorMensal ? inputError : inputNormal} pl-10 pr-10`}
                                    />
                                    {valorMensalFormatado && (
                                      <button
                                        type="button"
                                        onClick={() => { setValorMensal(''); setValorMensalFormatado(''); limparErro('valorMensal'); }}
                                        aria-label="Limpar valor de mensais"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors p-1"
                                      >
                                        <X size={14} />
                                      </button>
                                    )}
                                  </div>
                                  {limitesParcelas && limitesParcelas.maxMensal > 0 && (
                                    <p className="text-xs text-ink-faint mt-1.5 leading-relaxed">
                                      Máximo: <span className="font-semibold text-ink-base">{formatarMoeda(limitesParcelas.maxMensal)}</span>
                                      <span className="text-ink-faint"> — em {limitesParcelas.meses} {limitesParcelas.meses === 1 ? 'mês' : 'meses'}{limitesParcelas.totalIntercCurrent > 0 ? ' (considerando intercaladas)' : ''}</span>
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-xs text-ink-faint leading-relaxed bg-surface-muted rounded-md px-3 py-2">
                                  Será calculado automaticamente com base no orçamento restante.
                                </p>
                              )}
                              <ErrorPopup mensagem={erros.valorMensal} onClose={() => limparErro('valorMensal')} />
                            </div>

                            {/* Intercaladas */}
                            {temIntercaladas && numInter > 0 && (
                              <div data-field="valorIntercalada">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-3 h-3 bg-amber-500 rounded-sm flex-shrink-0"></div>
                                  <label className="text-sm font-medium text-ink-base">
                                    Valor de <span className="font-bold">Intercaladas</span>
                                  </label>
                                </div>

                                {/* Toggle Definir / Automático */}
                                <div className="inline-flex rounded-lg border border-surface-border overflow-hidden mb-2 w-full sm:w-auto" role="radiogroup" aria-label="Modo do valor de intercaladas">
                                  <button
                                    type="button"
                                    role="radio"
                                    aria-checked={modoIntercalada === 'definir'}
                                    onClick={() => setModoIntercalada('definir')}
                                    className={`flex-1 sm:flex-initial min-h-[40px] px-4 py-1.5 text-xs font-semibold transition-colors ${
                                      modoIntercalada === 'definir'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-white text-ink-faint hover:text-ink-base'
                                    }`}
                                  >
                                    Definir valor
                                  </button>
                                  <button
                                    type="button"
                                    role="radio"
                                    aria-checked={modoIntercalada === 'auto'}
                                    onClick={() => {
                                      setModoIntercalada('auto');
                                      setValorIntercalada('');
                                      setValorIntercaladaFormatado('');
                                      limparErro('valorIntercalada');
                                    }}
                                    className={`flex-1 sm:flex-initial min-h-[40px] px-4 py-1.5 text-xs font-semibold transition-colors border-l border-surface-border ${
                                      modoIntercalada === 'auto'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-white text-ink-faint hover:text-ink-base'
                                    }`}
                                  >
                                    Simular
                                  </button>
                                </div>

                                {modoIntercalada === 'definir' ? (
                                  <>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint font-medium">R$</span>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={valorIntercaladaFormatado}
                                        onChange={handleIntercaladaInput}
                                        placeholder="5.000,00"
                                        className={`${erros.valorIntercalada ? inputError : inputNormal} pl-10 pr-10`}
                                      />
                                      {valorIntercaladaFormatado && (
                                        <button
                                          type="button"
                                          onClick={() => { setValorIntercalada(''); setValorIntercaladaFormatado(''); limparErro('valorIntercalada'); }}
                                          aria-label="Limpar valor de intercaladas"
                                          className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors p-1"
                                        >
                                          <X size={14} />
                                        </button>
                                      )}
                                    </div>
                                    {limitesParcelas && limitesParcelas.maxIntercalada > 0 && (
                                      <p className="text-xs text-ink-faint mt-1.5 leading-relaxed">
                                        Máximo: <span className="font-semibold text-ink-base">{formatarMoeda(limitesParcelas.maxIntercalada)}</span>
                                        <span className="text-ink-faint"> — em {limitesParcelas.numInterc} parcela{limitesParcelas.numInterc === 1 ? '' : 's'}{limitesParcelas.totalMensaisCurrent > 0 ? ' (considerando mensais)' : ''}</span>
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-xs text-ink-faint leading-relaxed bg-surface-muted rounded-md px-3 py-2">
                                    Serão calculadas automaticamente com base no orçamento restante.
                                  </p>
                                )}
                                <ErrorPopup mensagem={erros.valorIntercalada} onClose={() => limparErro('valorIntercalada')} />
                              </div>
                            )}
                          </div>
                        );
                    })()}
                    </div>
                  </div>
                </>
              )}

            </div>
          )}

        </Card>

        {/* Calculate Button */}
        {distribuicao?.excede && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
            <p className="text-sm text-red-600 font-medium flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              Corrija os valores informados antes de calcular.
            </p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="secondary"
            size="lg"
            icon={<RotateCcw size={16} />}
            onClick={limparDados}
            className="col-span-1 w-full"
          >
            Limpar
          </Button>
          <Button
            variant="primary"
            size="lg"
            icon={<Calculator size={18} />}
            onClick={calcular}
            disabled={!!distribuicao?.excede}
            className="col-span-2 w-full"
          >
            Calcular Simulações
          </Button>
        </div>

        {/* Required Fields Checklist — shown after first Calculate attempt */}
        {tentouCalcular && (() => {
          const fields = [
            { key: 'valorImovel', label: 'Valor do imóvel', ok: parseFloat(valorImovel) > 0 },
            { key: 'dataEntrega', label: 'Data de entrega', ok: !!(entregaMes && entregaAno) },
          ];
          if (!distribuicaoCustomizada) {
            fields.push(
              { key: 'percAteEntrega', label: '% até entrega', ok: percAteEntrega !== '' && !isNaN(parseFloat(percAteEntrega)) },
              { key: 'percEntrada', label: '% entrada', ok: percEntrada !== '' && !isNaN(parseFloat(percEntrada)) },
            );
          }

          const hasErrors = fields.some(f => !f.ok);
          if (!hasErrors) return null;

          return (
            <div className="mt-3 bg-white border border-slate-200 rounded-xl shadow-sm p-3">
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Campos obrigatórios</p>
              <div className="flex flex-wrap gap-2">
                {fields.map(f => (
                  f.ok ? (
                    <div key={f.key} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-700">{f.label}</span>
                    </div>
                  ) : (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => {
                        const el = document.querySelector(`[data-field="${f.key}"]`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs font-medium text-red-700">{f.label} ↑</span>
                    </button>
                  )
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Suggestions Modal — shown when values exceed available limit */}
      <Modal
        open={showSuggestionsModal}
        onClose={() => setShowSuggestionsModal(false)}
        size="md"
      >
        {suggestionsData && (() => {
          const {
            disponivel, mensal: mensalAtual, intercaladaDesejada: intercaladaAtual,
            meses, numIntercaladas, maxMensalComIntercalada, maxMensalSemIntercalada,
            percUsado, percDisponivel, totalMensais, totalIntercaladas, valorImovel: valorImovelCalc,
            ateEntrega: ateEntregaSnap, entradaMinima: entradaMinimaSnap
          } = suggestionsData;

          const percMensalSugerido = maxMensalComIntercalada != null && maxMensalComIntercalada > 0
            ? ((maxMensalComIntercalada * meses) / valorImovelCalc) * 100 + ((intercaladaAtual * numIntercaladas) / valorImovelCalc) * 100
            : 0;
          const percSemIntercalada = maxMensalSemIntercalada > 0
            ? ((mensalAtual * meses) / valorImovelCalc) * 100
            : 0;

          const applySuggestion = (type) => {
            if (type === 'reduce') {
              const novoValor = Math.floor(maxMensalComIntercalada);
              const formatted = formatarInputMoeda(novoValor.toString() + '00');
              setValorMensalFormatado(formatted);
              setValorMensal(obterValorNumerico(formatted).toString());
            } else if (type === 'noIntercalada') {
              setValorIntercalada('');
              setValorIntercaladaFormatado('');
              setTemIntercaladas(false);
            } else if (type === 'auto') {
              setValorMensal('');
              setValorMensalFormatado('');
              setValorIntercalada('');
              setValorIntercaladaFormatado('');
            }
            setErros({});
            setShowSuggestionsModal(false);
          };

          return (
            <div className="-m-6">
              {/* Header */}
              <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-800 text-base">Ajuste necessário</h3>
                  <p className="text-sm text-amber-600">Os valores das parcelas ultrapassam o disponível</p>
                </div>
              </div>

              {/* Explanation */}
              <div className="px-6 py-4 space-y-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Entenda o cálculo:</p>
                  <div className="space-y-2">
                    {/* Como chegamos no valor disponível */}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Valor do Imóvel</span>
                      <span className="font-medium text-slate-700 tabular-nums">{formatarMoeda(valorImovelCalc)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Pagar até Entrega ({ateEntregaSnap.toFixed(0)}%)</span>
                      <span className="font-medium text-slate-700 tabular-nums">{formatarMoeda((valorImovelCalc * ateEntregaSnap) / 100)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">− Entrada Mínima ({entradaMinimaSnap.toFixed(0)}%)</span>
                      <span className="font-medium text-slate-700 tabular-nums">{formatarMoeda((valorImovelCalc * entradaMinimaSnap) / 100)}</span>
                    </div>
                    <div className="border-t border-slate-300 pt-2 flex justify-between text-sm">
                      <span className="text-emerald-700 font-semibold">Disponível para parcelas ({percDisponivel.toFixed(1)}%)</span>
                      <span className="font-bold text-emerald-700 tabular-nums">{formatarMoeda(disponivel)}</span>
                    </div>

                    {/* O que está sendo alocado */}
                    <div className="pt-3 mt-2 border-t border-slate-200 space-y-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Seus valores</p>
                      {mensalAtual > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">{formatarMoeda(mensalAtual)} × {meses} meses</span>
                          <span className="font-semibold text-blue-700 tabular-nums">{formatarMoeda(totalMensais)}</span>
                        </div>
                      )}
                      {intercaladaAtual > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">{formatarMoeda(intercaladaAtual)} × {numIntercaladas} intercaladas</span>
                          <span className="font-semibold text-amber-700 tabular-nums">{formatarMoeda(totalIntercaladas)}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between text-sm">
                      <span className="text-red-700 font-semibold">Total informado</span>
                      <span className="font-bold text-red-700 tabular-nums">{formatarMoeda(totalMensais + totalIntercaladas)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-red-700 font-semibold">Excedente</span>
                      <span className="font-bold text-red-700 tabular-nums">{formatarMoeda((totalMensais + totalIntercaladas) - disponivel)}</span>
                    </div>
                  </div>
                </div>

                {/* Suggestions */}
                <p className="text-sm font-semibold text-slate-700">Escolha como corrigir:</p>
                <div className="space-y-2">
                  {maxMensalComIntercalada != null && maxMensalComIntercalada > 0 && (
                    <button
                      type="button"
                      onClick={() => applySuggestion('reduce')}
                      className="w-full text-left p-3 sm:p-4 bg-white border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                        <span className="text-sm font-bold text-blue-800">Ajustar valor mensal</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Recomendada</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="bg-blue-50 rounded-lg p-2">
                          <p className="text-[11px] text-blue-600 uppercase font-semibold">Mensal</p>
                          <p className="text-sm font-bold text-blue-800">
                            <s className="text-red-400 font-normal">{formatarMoeda(mensalAtual)}</s> → {formatarMoeda(Math.floor(maxMensalComIntercalada))}
                          </p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-2">
                          <p className="text-[11px] text-amber-600 uppercase font-semibold">Intercalada</p>
                          <p className="text-sm font-bold text-amber-800">{formatarMoeda(intercaladaAtual)} <span className="text-xs font-normal">(mantém)</span></p>
                        </div>
                      </div>
                    </button>
                  )}

                  {mensalAtual > 0 && intercaladaAtual > 0 && percSemIntercalada <= percDisponivel && (
                    <button
                      type="button"
                      onClick={() => applySuggestion('noIntercalada')}
                      className="w-full text-left p-3 sm:p-4 bg-white border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      <span className="text-sm font-bold text-slate-800">Manter mensal, remover intercalada</span>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2">
                        <div className="bg-blue-50 rounded-lg p-2">
                          <p className="text-[11px] text-blue-600 uppercase font-semibold">Mensal</p>
                          <p className="text-sm font-bold text-blue-800">{formatarMoeda(mensalAtual)} <span className="text-xs font-normal">(mantém)</span></p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-[11px] text-slate-500 uppercase font-semibold">Intercalada</p>
                          <p className="text-sm font-bold text-slate-500"><s className="text-red-400 font-normal">{formatarMoeda(intercaladaAtual)}</s> → Desativada</p>
                        </div>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => applySuggestion('auto')}
                    className="w-full text-left p-3 sm:p-4 bg-white border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-xl transition-all"
                  >
                    <span className="text-sm font-bold text-emerald-800">Distribuição automática</span>
                    <div className="bg-emerald-50 rounded-lg p-2 sm:p-3 mt-2">
                      <p className="text-sm text-emerald-700">Limpar os dois campos e deixar o sistema distribuir automaticamente os valores de forma otimizada.</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 px-6 py-3 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSuggestionsModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Fechar e ajustar manualmente
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Modal — campos obrigatórios para personalizar */}
      <Modal
        open={camposIncompletosModal.open}
        onClose={() => setCamposIncompletosModal({ open: false, campos: [] })}
        size="sm"
      >
        <div className="-m-6">
          {/* Header */}
          <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle size={20} className="text-red-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-ink-base">Campos obrigatórios</h3>
              <p className="text-xs text-ink-faint">Preencha os dados antes de personalizar</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <p className="text-sm text-ink-base mb-3">
              Para personalizar a distribuição das parcelas, preencha:
            </p>
            <ul className="space-y-2">
              {camposIncompletosModal.campos.map(c => (
                <li key={c.field} className="flex items-center gap-2 text-sm text-ink-base">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                  {c.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-6 py-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                const primeiroCampo = camposIncompletosModal.campos[0]?.field;
                setCamposIncompletosModal({ open: false, campos: [] });
                if (primeiroCampo) {
                  setTimeout(() => {
                    const el = document.querySelector(`[data-field="${primeiroCampo}"]`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }
              }}
              className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
