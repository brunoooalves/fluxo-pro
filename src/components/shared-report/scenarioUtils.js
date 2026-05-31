export function formatarMoeda(valor) {
  if (!valor && valor !== 0) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

export function formatPeriod(period) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const year = period.slice(0, 4);
  const month = parseInt(period.slice(4, 6)) - 1;
  return months[month] + '/' + year;
}

export function cleanPhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export function parseDeliveryDate(dateStr) {
  if (!dateStr) return null;
  const normalized = dateStr.length === 6
    ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}`
    : dateStr;
  const d = new Date(normalized + '-01T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

export function classifyScenarios(opcoes) {
  if (!opcoes || opcoes.length === 0) return { strategies: [], remaining: [] };

  if (opcoes.length === 1) {
    return {
      strategies: [{ ...opcoes[0], strategyType: 'single', originalIndex: 0 }],
      remaining: [],
    };
  }

  if (opcoes.length === 2) {
    return {
      strategies: [
        { ...opcoes[0], strategyType: 'conservative', originalIndex: 0 },
        { ...opcoes[1], strategyType: 'aggressive', originalIndex: 1 },
      ],
      remaining: [],
    };
  }

  const midIndex = Math.floor(opcoes.length / 2);
  const lastIndex = opcoes.length - 1;

  const strategyIndices = new Set([0, midIndex, lastIndex]);
  const strategies = [
    { ...opcoes[0], strategyType: 'conservative', originalIndex: 0 },
    { ...opcoes[midIndex], strategyType: 'balanced', originalIndex: midIndex },
    { ...opcoes[lastIndex], strategyType: 'aggressive', originalIndex: lastIndex },
  ];

  const remaining = opcoes
    .map((o, i) => ({ ...o, originalIndex: i }))
    .filter((_, i) => !strategyIndices.has(i));

  return { strategies, remaining };
}

function detectVariations(strategies) {
  if (strategies.length < 2) return { entradaVaries: false, mensalVaries: false, intercaladaVaries: false };

  const entradas = strategies.map(s => s.entrada);
  const mensais = strategies.map(s => s.mensais?.valorParcela || 0);
  const intercaladas = strategies.map(s => s.intercaladas?.valorParcela || 0);

  const TOLERANCE = 1;
  const allSame = (arr) => arr.every(v => Math.abs(v - arr[0]) < TOLERANCE);

  return {
    entradaVaries: !allSame(entradas),
    mensalVaries: !allSame(mensais),
    intercaladaVaries: !allSame(intercaladas),
    hasIntercaladas: strategies.some(s => s.intercaladas && s.intercaladas.total > 0),
  };
}

export function generateProsCons(strategy, valorImovel, allStrategies) {
  const entradaPercent = valorImovel > 0 ? ((strategy.entrada / valorImovel) * 100).toFixed(0) : 0;
  const mensal = strategy.mensais?.valorParcela || 0;
  const intercalada = strategy.intercaladas?.valorParcela || 0;
  const variations = detectVariations(allStrategies);

  if (strategy.strategyType === 'single') {
    return buildSingleProsCons(strategy, entradaPercent, mensal, intercalada);
  }

  if (!variations.entradaVaries && !variations.mensalVaries) {
    return buildIdenticalProsCons(strategy, entradaPercent, mensal, intercalada, variations);
  }

  if (variations.entradaVaries && !variations.mensalVaries) {
    return buildEntradaOnlyVaries(strategy, entradaPercent, mensal, intercalada, variations);
  }

  if (!variations.entradaVaries && variations.mensalVaries) {
    return buildMensalOnlyVaries(strategy, entradaPercent, mensal, intercalada, variations);
  }

  return buildFullVaries(strategy, entradaPercent, mensal, intercalada, variations);
}

function buildSingleProsCons(strategy, entradaPercent, mensal, intercalada) {
  const entradaNum = parseInt(entradaPercent);
  const financiamento = strategy.financiamento || 0;
  const totalMensais = strategy.mensais?.total || 0;
  const totalIntercaladas = strategy.intercaladas?.total || 0;
  const totalAteEntrega = strategy.entrada + totalMensais + totalIntercaladas;

  const pros = [];
  const cons = [];

  if (entradaNum <= 20) {
    pros.push(`Entrada acessível de ${entradaPercent}% — você preserva boa parte do seu capital`);
  } else if (entradaNum <= 40) {
    pros.push(`Entrada de ${entradaPercent}% equilibra desembolso inicial e parcelas futuras`);
  } else {
    pros.push(`Entrada robusta de ${entradaPercent}% — reduz significativamente o saldo devedor`);
  }

  if (mensal > 0 && strategy.mensais?.quantidade) {
    const meses = strategy.mensais.quantidade;
    if (meses <= 12) {
      pros.push(`Apenas ${meses} parcelas mensais — período curto de comprometimento`);
    } else {
      pros.push(`Pagamento diluído em ${meses} meses durante a construção`);
    }
  }

  if (intercalada > 0) {
    pros.push(`Parcelas intercaladas ajudam a compor o valor sem pesar no mês a mês`);
  }

  if (financiamento > 0) {
    const percFinanciamento = strategy.entrada > 0
      ? ((financiamento / (financiamento + totalAteEntrega)) * 100).toFixed(0)
      : 0;
    cons.push(`Saldo pós-chaves de ${formatarMoeda(financiamento)} (${percFinanciamento}%) a ser pago ou financiado na entrega`);
  }

  return {
    name: 'Cenário Selecionado',
    pros,
    cons,
    idealFor: 'Este é o cenário que seu corretor selecionou para o seu perfil. Converse com ele para ajustar se necessário.',
  };
}

function buildIdenticalProsCons(strategy, entradaPercent, mensal, intercalada, variations) {
  return {
    name: getStrategyName(strategy.strategyType),
    pros: [
      `Entrada de ${entradaPercent}% do valor do imóvel`,
      mensal > 0 ? `Parcela mensal de ${formatarMoeda(mensal)}` : null,
    ].filter(Boolean),
    cons: [],
    idealFor: 'Os cenários são equivalentes nesta simulação.',
  };
}

function buildEntradaOnlyVaries(strategy, entradaPercent, mensal, intercalada, variations) {
  const type = strategy.strategyType;
  const hasInterc = variations.hasIntercaladas;

  if (type === 'conservative') {
    const pros = [
      `Menor entrada: apenas ${entradaPercent}% do valor do imóvel`,
      'Você mantém mais dinheiro disponível para imprevistos',
    ];
    const cons = [];
    if (hasInterc) {
      cons.push(`Intercaladas mais altas: ${formatarMoeda(intercalada)}`);
      cons.push('Com parcelas mensais iguais, o valor que "sobra" vai para as intercaladas');
    }
    return { name: 'Entrada Leve', pros, cons, idealFor: 'Quem prefere preservar capital e diluir o restante nas intercaladas.' };
  }

  if (type === 'balanced') {
    const pros = [
      `Entrada intermediária de ${entradaPercent}%`,
      hasInterc ? 'Intercaladas em valor equilibrado' : 'Equilíbrio entre entrada e saldo pós-chaves',
    ];
    const cons = [
      'Exige planejamento para a entrada sem comprometer sua reserva',
    ];
    return { name: 'Equilibrado', pros, cons, idealFor: 'Quem busca equilíbrio entre desembolso inicial e parcelas futuras.' };
  }

  const pros = [
    `Maior entrada: ${entradaPercent}% do valor`,
  ];
  if (hasInterc) {
    pros.push(`Intercaladas mais baixas: ${formatarMoeda(intercalada)}`);
    pros.push('Com a maior entrada, sobra menos para diluir nas intercaladas');
  } else {
    pros.push('Menor saldo pós-chaves a ser pago ou financiado');
  }
  const cons = [
    `Desembolso inicial alto: ${formatarMoeda(strategy.entrada)}`,
    'Reduz sua liquidez no curto prazo',
  ];
  return { name: 'Entrada Forte', pros, cons, idealFor: 'Quem tem capital disponível e quer reduzir parcelas intercaladas.' };
}

function buildMensalOnlyVaries(strategy, entradaPercent, mensal, intercalada, variations) {
  const type = strategy.strategyType;
  const hasInterc = variations.hasIntercaladas;

  if (type === 'conservative') {
    const pros = [
      'Parcela mensal mais baixa',
    ];
    if (hasInterc) {
      pros.push(`Intercaladas mais altas compensam a parcela menor: ${formatarMoeda(intercalada)}`);
    }
    const cons = [
      hasInterc ? 'Intercaladas mais pesadas para compensar' : 'Maior saldo pós-chaves',
    ];
    return { name: 'Parcela Leve', pros, cons, idealFor: 'Quem quer comprometer menos da renda mensal.' };
  }

  if (type === 'balanced') {
    return {
      name: 'Equilibrado',
      pros: [
        `Parcela mensal intermediária: ${formatarMoeda(mensal)}`,
        hasInterc ? 'Intercaladas em valor equilibrado' : 'Equilíbrio entre mensal e saldo final',
      ],
      cons: [],
      idealFor: 'Quem busca equilíbrio entre parcela mensal e intercaladas.',
    };
  }

  const pros = [
    `Parcela mensal mais alta: ${formatarMoeda(mensal)}`,
  ];
  if (hasInterc) {
    pros.push(`Intercaladas mais baixas: ${formatarMoeda(intercalada)}`);
  }
  return {
    name: 'Parcela Forte',
    pros,
    cons: ['Maior comprometimento da renda mensal durante a obra'],
    idealFor: 'Quem prefere pagar mais por mês para reduzir as intercaladas.',
  };
}

function buildFullVaries(strategy, entradaPercent, mensal, intercalada, variations) {
  const type = strategy.strategyType;
  const hasInterc = variations.hasIntercaladas;

  if (type === 'conservative') {
    const pros = [
      `Menor entrada: apenas ${entradaPercent}% do valor`,
      'Preserva seu capital para imprevistos ou investimentos',
    ];
    const cons = [`Parcela mensal mais alta: ${formatarMoeda(mensal)}`];
    if (hasInterc && intercalada > 0) {
      cons.push('Maior exposição à correção do INCC sobre as parcelas');
    }
    return { name: 'Entrada Leve', pros, cons, idealFor: 'Quem prefere preservar capital e tem renda mensal confortável.' };
  }

  if (type === 'balanced') {
    const pros = [
      `Entrada de ${entradaPercent}% equilibra desembolso e parcelas`,
      'Parcela mensal em valor intermediário',
      'Menor risco: não compromete demais nem a reserva nem a renda',
    ];
    return {
      name: 'Equilibrado',
      pros,
      cons: ['Exige planejamento para a entrada sem comprometer a reserva'],
      idealFor: 'Quem busca equilíbrio entre entrada e parcelas. O cenário mais escolhido.',
    };
  }

  const pros = [
    `Parcela mensal mais baixa: ${formatarMoeda(mensal)}`,
    'Menos comprometimento da renda durante a obra',
  ];
  if (hasInterc && intercalada > 0) {
    pros.push('Menor impacto do INCC sobre o total pago');
  }
  return {
    name: 'Entrada Forte',
    pros,
    cons: [
      `Entrada de ${entradaPercent}% do valor (${formatarMoeda(strategy.entrada)})`,
      'Maior desembolso inicial reduz sua liquidez',
    ],
    idealFor: 'Quem tem capital disponível e quer parcelas mensais menores.',
  };
}

function getStrategyName(type) {
  const names = {
    conservative: 'Entrada Leve',
    balanced: 'Equilibrado',
    aggressive: 'Entrada Forte',
    single: 'Seu Cenário',
  };
  return names[type] || 'Cenário';
}

export function generatePdfStrategyText(strategies, valorImovel) {
  if (!strategies || strategies.length < 2) return [];

  return strategies.map(strategy => {
    const prosCons = generateProsCons(strategy, valorImovel, strategies);
    return {
      ...strategy,
      strategyName: prosCons.name,
      description: prosCons.idealFor,
      pros: prosCons.pros,
      cons: prosCons.cons,
    };
  });
}
