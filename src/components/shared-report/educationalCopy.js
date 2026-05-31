export const INTRO = {
  title: 'Entenda sua simulação',
  subtitle: 'Antes de escolher, conheça os termos usados nesta simulação. Cada cenário combina esses elementos de forma diferente.',
};

export const GLOSSARY = {
  entrada: {
    term: 'Entrada',
    description: 'Valor pago no ato da assinatura do contrato. Quanto maior a entrada, menores serão as parcelas mensais durante a obra.',
  },
  mensais: {
    term: 'Parcelas Mensais',
    description: 'Valores pagos todo mês durante o período de construção do imóvel. São corrigidas pelo INCC (índice da construção civil).',
  },
  intercaladas: {
    term: 'Parcelas Intercaladas',
    description: 'Pagamentos extras em intervalos maiores (trimestral, semestral ou anual). Ajudam a reduzir o valor das parcelas mensais.',
  },
  saldoPosChaves: {
    term: 'Saldo pós-chaves',
    description: 'Valor restante após a entrega das chaves. Pode ser financiado com banco ou pago à vista. Não sofre correção do INCC durante a obra.',
  },
};

export const HERO = {
  badge: 'Cenário Recomendado',
  explanation: 'Este cenário equilibra o valor da entrada com parcelas mensais acessíveis, sem comprometer demais sua reserva financeira nem sua renda mensal.',
  metricsLabels: {
    entrada: 'Entrada',
    mensal: 'Parcela mensal',
    intercaladas: 'Intercaladas',
    financiamento: 'Saldo pós-chaves',
  },
};

export const STRATEGY = {
  sectionTitle: 'Compare as estratégias',
  sectionSubtitle: 'Cada estratégia tem vantagens e desvantagens. Escolha a que melhor se encaixa na sua realidade financeira.',
  prosLabel: 'Vantagens',
  consLabel: 'Pontos de atenção',
  idealLabel: 'Ideal para:',
};

export const EXPANDER = {
  showAll: (count) => `Ver todos os ${count} cenários`,
  hideAll: 'Ocultar cenários',
};

export const CHART = {
  title: 'Comparativo de Parcelas Mensais',
  subtitle: 'Quanto maior a entrada, menor a parcela mensal. Escolha o equilíbrio ideal para o seu orçamento.',
};

export const MARKET = {
  sectionTitle: 'O que dizem os dados do mercado',
  sectionSubtitle: 'Dados reais do índice FipeZap+ para ajudar na sua decisão de investimento.',
  metrics: {
    appreciation: 'Nos últimos anos, imóveis nessa região valorizaram em média essa taxa ao ano.',
    incc: 'O INCC é o índice que corrige o valor das parcelas durante a obra. Funciona como uma "inflação da construção".',
    realGain: 'Esse é o ganho acima da correção do INCC. Significa que seu imóvel cresce mais do que a correção que você paga.',
    realGainNegative: 'A valorização ficou abaixo da correção do INCC, mas o imóvel ainda protege seu patrimônio como ativo real.',
  },
  investmentCallout: {
    projection: 'Essa projeção é baseada na tendência histórica de valorização da região. Além da valorização, você terá o imóvel para morar ou gerar renda com aluguel.',
  },
  neighborhoodIntro: (cityName) => `Compare o preço do metro quadrado entre os bairros de ${cityName}. Isso ajuda a entender se o imóvel está em uma região valorizada.`,
};

export const INCC_EDU = {
  title: 'Entenda o INCC',
  intro: 'O INCC (Índice Nacional de Custo da Construção) é aplicado sobre suas parcelas mensais durante a obra. É importante considerar esse custo no seu planejamento.',
  naPratica: (parcelaBase, parcelaFinal, totalCorrecao, totalMeses) =>
    `Na prática, sua parcela de ${parcelaBase} passaria para aproximadamente ${parcelaFinal} na última das ${totalMeses} parcelas. O custo total do INCC nessa simulação é de ${totalCorrecao}.`,
};

export const CTA = {
  title: 'Próximos Passos',
  steps: [
    {
      number: '1',
      title: 'Escolha seu cenário',
      description: 'Revise as opções acima e identifique qual se encaixa melhor no seu orçamento e objetivos.',
    },
    {
      number: '2',
      title: 'Fale com seu corretor',
      description: 'Tire todas as suas dúvidas sobre prazos, documentação e condições de pagamento.',
    },
    {
      number: '3',
      title: 'Reserve sua unidade',
      description: 'Garanta o imóvel antes que a condição comercial mude ou a unidade seja reservada por outro comprador.',
    },
  ],
  buttonPrefix: 'Falar com',
};
