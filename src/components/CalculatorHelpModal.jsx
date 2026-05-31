import React from 'react';
import { Modal } from './ui';
import { Calculator, FileText, BarChart3, TrendingUp, Sparkles, Sliders, Percent } from 'lucide-react';

/**
 * CalculatorHelpModal — Guia completo de uso da Calculadora de Fluxo de Pagamentos
 */
export default function CalculatorHelpModal({ open, onClose }) {
  const SectionTitle = ({ icon: Icon, children }) => (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <Icon size={18} className="text-brand-500 flex-shrink-0" />
      <h3 className="text-base font-bold text-ink-base">{children}</h3>
    </div>
  );

  const SubSection = ({ title, children }) => (
    <div className="mb-4">
      <h4 className="text-sm font-semibold text-ink-base mb-1.5">{title}</h4>
      <div className="text-sm text-ink-muted leading-relaxed">{children}</div>
    </div>
  );

  const Tip = ({ children }) => (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 my-2">
      <span className="text-amber-500 font-bold text-xs mt-0.5">DICA</span>
      <p className="text-xs text-amber-800">{children}</p>
    </div>
  );

  const Example = ({ children }) => (
    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 my-2">
      <span className="text-blue-500 font-bold text-xs mt-0.5">EX</span>
      <p className="text-xs text-blue-800">{children}</p>
    </div>
  );

  const StepList = ({ steps }) => (
    <ol className="list-decimal list-inside space-y-1.5 text-sm text-ink-muted ml-1">
      {steps.map((step, i) => (
        <li key={i}>{step}</li>
      ))}
    </ol>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Como usar a Calculadora"
      description="Guia completo com exemplos"
      size="xl"
    >
      <div className="space-y-2">

        {/* ===== VISAO GERAL ===== */}
        <SectionTitle icon={Calculator}>O que faz essa calculadora?</SectionTitle>
        <p className="text-sm text-ink-muted leading-relaxed">
          Simula diferentes formas de pagar um imóvel na planta. Você informa o valor, a data de entrega e como quer dividir o pagamento. A calculadora gera vários cenários para você comparar e escolher o melhor.
        </p>
        <p className="text-sm text-ink-muted leading-relaxed mt-2">
          A ferramenta tem <strong>3 telas</strong>: o formulário (onde você preenche os dados), os resultados (onde compara os cenários) e a simulação INCC (que mostra como a correção da construção civil afeta as parcelas).
        </p>
        <Tip>Primeira vez aqui? Clique em "Gerar valores de teste" no topo da página para preencher tudo automaticamente e ver como funciona.</Tip>

        {/* ===== TELA 1: FORMULARIO ===== */}
        <SectionTitle icon={FileText}>Tela 1 — Preenchendo o formulário</SectionTitle>

        <SubSection title="Corretor (opcional)">
          <p>Seção colapsável com os dados do corretor. Toque no cabeçalho para abrir/fechar. Esses dados aparecem apenas no relatório exportado.</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5 ml-2">
            <li><strong>Nome, CRECI, Contato</strong> — preencha para personalizar o relatório</li>
            <li><strong>Salvar corretor</strong> — salva no navegador para reutilizar em outras simulações</li>
            <li><strong>Limpar</strong> — apaga o corretor salvo</li>
          </ul>
          <Example>Quando fechada, a seção mostra um resumo: "João Silva — CRECI 12345" ou "Nenhum corretor informado".</Example>
          <Tip>O corretor salvo carrega automaticamente toda vez que você abre a calculadora. Salve uma vez e não precisa preencher de novo.</Tip>
        </SubSection>

        <SubSection title="Identificação do Imóvel (opcional)">
          <p>Seção colapsável para dados do imóvel. Também aparece apenas no relatório.</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5 ml-2">
            <li><strong>Selecionar imóvel salvo</strong> — se já cadastrou antes, escolha na lista</li>
            <li><strong>Novo imóvel</strong> — cadastre nome, endereço, cidade, estado, metragem e informações gerais</li>
            <li><strong>Salvar</strong> — guarda o imóvel para uso futuro (até 30 salvos, válidos por 30 dias)</li>
          </ul>
          <Example>Imóvel: "Residencial Aurora" em Maceió/AL, 85m². Ao fechar a seção, aparece "Residencial Aurora — Maceió/AL".</Example>
          <Tip>Se preencher a metragem, o relatório calcula automaticamente o preço por m².</Tip>
        </SubSection>

        <SubSection title="Simulação — Dados obrigatórios">
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Valor do Imóvel (R$)</strong> — o preço total. Digite e a formatação é automática.</li>
            <li><strong>Data de Entrega</strong> — quando as chaves serão entregues. Precisa ser no mínimo 6 meses no futuro.</li>
            <li><strong>Metragem (m²)</strong> — opcional, usado para calcular preço/m² no relatório.</li>
          </ul>
          <Example>Imóvel de R$ 750.000 com entrega em agosto de 2028 (28 meses). A calculadora usa esses 28 meses para definir quantas parcelas mensais e intercaladas existirão.</Example>
        </SubSection>

        <SubSection title="Tipo de Simulação — Escalonável">
          <p>O modo padrão. Gera vários cenários automaticamente, variando a entrada de menos para mais.</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
            <li><strong>Pagar até a Entrega (%)</strong> — quanto do valor total será pago antes das chaves. O resto vira financiamento.</li>
            <li><strong>Entrada Mínima (%)</strong> — a partir de qual % a simulação começa.</li>
            <li><strong>Valor Mensal Desejado (R$)</strong> — se quiser fixar a parcela mensal. Deixe em branco para a calculadora distribuir sozinha.</li>
          </ul>
          <Example>Pagar até entrega: 30%, Entrada mínima: 10%, Incremento: 5%. Resultado: cenários com 10%, 15%, 20%, 25% e 30% de entrada.</Example>
          <Tip>Quanto menor a entrada mínima e maior o pagamento até a entrega, mais cenários serão gerados para comparar.</Tip>
        </SubSection>

        <SubSection title="Parcelas Intercaladas">
          <p>Ative o switch "Contém intercaladas" para adicionar parcelas extras além das mensais.</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
            <li><strong>Frequência</strong> — Trimestral (a cada 3 meses), Semestral (6 meses) ou Anual (12 meses)</li>
            <li><strong>Valor da Parcela (R$)</strong> — fixe um valor ou deixe em branco para distribuir automaticamente</li>
          </ul>
          <Example>Com entrega em 28 meses e frequência trimestral: serão 9 parcelas intercaladas. Se semestral: 4 parcelas. Se anual: 2 parcelas.</Example>
        </SubSection>

        <SubSection title="Ajustar proporção mensais/intercaladas">
          <p>Quando ambos os valores (mensal e intercalada) estão em branco, aparece um controle para definir como dividir entre eles.</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
            <li><strong>Presets rápidos</strong> — botões com divisões prontas (ex: 10/4, 15/2.5)</li>
            <li><strong>Slider</strong> — arraste para ajustar livremente. Use os botões [-] e [+] para ajuste fino.</li>
          </ul>
          <Example>Slider em "Mensais: 9,5% / Intercaladas: 4,5%" significa que das parcelas antes da entrega, 9,5% vai para mensais e 4,5% para intercaladas.</Example>
        </SubSection>

        <SubSection title="Tipo de Simulação — Porcentagens">
          <p>Modo alternativo para controle total. Você define exatamente os percentuais de cada componente.</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
            <li><strong>Até 3 combinações</strong> — cada uma com % de Entrada, % Parcelas e % Intercaladas</li>
            <li><strong>Soma e Saldo</strong> — mostrados abaixo de cada combinação. O saldo é o financiamento.</li>
            <li><strong>Com simulação Escalonável</strong> — a partir das combinações escolhidas, será aplicada a simulação escalonável, incrementando a porcentagem da entrada</li>
          </ul>
          <Example>Combinação A: 15% entrada + 10% parcelas + 5% intercaladas = 30% (saldo: 70% financiado). Combinação B: 25% + 5% + 0% = 30%.</Example>
          <Tip>Use 2 ou 3 combinações para dar opções ao cliente: uma com entrada menor e parcela maior, outra com entrada maior e parcela menor.</Tip>
        </SubSection>

        <SubSection title="Configurações Avançadas">
          <p>Seção colapsável para ajustar como os cenários são gerados:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
            <li><strong>Incremento de Entrada (%)</strong> — a cada cenário, a entrada sobe esse valor. Padrão: 5%.</li>
            <li><strong>Número de Simulações</strong> — quantos cenários gerar. Padrão: 6, máximo: 50.</li>
          </ul>
          <Example>Incremento 3% com 8 simulações e entrada mínima 10%: gera cenários de 10%, 13%, 16%, 19%, 22%, 25%, 28%, 31%.</Example>
        </SubSection>

        <SubSection title="Barra de Distribuição Visual">
          <p>Logo acima do botão "Calcular Simulações", uma barra colorida mostra como o valor do imóvel está sendo dividido:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2 mt-1">
            <li>Azul escuro = Entrada</li>
            <li>Azul = Mensais</li>
            <li>Amarelo = Intercaladas</li>
            <li>Cinza = Saldo (financiamento)</li>
          </ul>
          <p className="mt-1">A barra atualiza em tempo real conforme você muda os valores.</p>
        </SubSection>

        <SubSection title="Botões do formulário">
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Limpar</strong> — zera todos os campos e fecha todas as seções. O corretor salvo no navegador é mantido.</li>
            <li><strong>Gerar valores de teste</strong> — preenche tudo com dados aleatórios válidos (inclusive corretor e imóvel) para testar rapidamente.</li>
            <li><strong>Calcular Simulações</strong> — valida os dados e gera os cenários.</li>
          </ul>
        </SubSection>

        {/* ===== TELA 2: RESULTADOS ===== */}
        <SectionTitle icon={BarChart3}>Tela 2 — Resultados</SectionTitle>

        <SubSection title="Gráfico de Barras">
          <p>No topo, um gráfico mostra visualmente como a parcela mensal diminui conforme a entrada aumenta. A primeira barra é marcada como "base" para referência.</p>
          <Example>Entrada de 10%: R$ 6,4k/mês. Entrada de 25%: R$ 3,5k/mês (-R$ 2,9k/mês). Você economiza quase R$ 3 mil por mês ao dar mais entrada.</Example>
          <Tip>No celular, o gráfico rola horizontalmente quando há muitos cenários. Arraste para o lado para ver todos.</Tip>
        </SubSection>

        <SubSection title="Cards de Cenário">
          <p>Cada card mostra um cenário completo:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2 mt-1">
            <li>Percentual e valor da entrada</li>
            <li>Parcelas mensais (quantidade e valor por parcela)</li>
            <li>Parcelas intercaladas (se houver)</li>
            <li>Saldo (valor financiado após entrega)</li>
            <li>Valor total</li>
          </ul>
          <p className="mt-1">O cenário do meio é marcado como "Recomendado" — representa um equilíbrio entre entrada e parcelas.</p>
        </SubSection>

        <SubSection title="Ajuste de valores nos cards">
          <p>Cada valor editável tem botões <strong>[-]</strong> e <strong>[+]</strong> para ajuste direto, sem voltar ao formulário:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
            <li><strong>Entrada</strong> — ajusta em 1% do valor do imóvel. Ao mudar, as parcelas mensais e intercaladas se redistribuem proporcionalmente.</li>
            <li><strong>Mensais</strong> — ajusta R$ 50 por parcela. A entrada absorve a diferença.</li>
            <li><strong>Intercaladas</strong> — ajusta R$ 100 por parcela. A entrada absorve a diferença.</li>
          </ul>
          <Example>Imóvel de R$ 750k. Você clica [+] na entrada: sobe R$ 7.500 (1%). As mensais e intercaladas diminuem para compensar. O saldo nunca muda.</Example>
          <Tip>Os valores ajustados aparecem no relatório exportado e atualizam o gráfico de barras em tempo real.</Tip>
        </SubSection>

        <SubSection title="Selecionar cenários para o relatório">
          <p>Você escolhe quais cenários vão para o relatório:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
            <li><strong>"Selecionar todos"</strong> — switch no topo dos cards. Marca ou desmarca tudo de uma vez.</li>
            <li><strong>"Incluir no relatório"</strong> — switch no rodapé de cada card. Controla individualmente.</li>
          </ul>
          <p className="mt-1">Cards desmarcados ficam mais claros (com transparência) para fácil identificação. Por padrão, todos começam selecionados.</p>
          <Example>Você gerou 7 cenários, mas só quer mostrar 3 ao cliente. Desligue os 4 que não interessam e exporte. O relatório terá apenas os 3 escolhidos.</Example>
        </SubSection>

        <SubSection title="Simular INCC">
          <p>Cada card tem um botão "Simular INCC". Ao clicar, você vai para a tela de correção INCC daquele cenário específico.</p>
        </SubSection>

        <SubSection title="Barra flutuante (rodapé)">
          <p>Fixa no rodapé da tela, com dois botões:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
            <li><strong>Seta (Nova Simulação)</strong> — volta ao formulário com todos os dados preservados para ajustar e recalcular.</li>
            <li><strong>Exportar Relatório</strong> — gera o PDF com os cenários selecionados. Mostra a contagem (ex: "4/7"). Se nenhum cenário estiver selecionado, o botão fica desabilitado.</li>
          </ul>
          <Tip>Se os dados do corretor e do imóvel não foram preenchidos no formulário, um modal aparece para preenchimento antes de gerar o relatório.</Tip>
        </SubSection>

        {/* ===== TELA 3: INCC ===== */}
        <SectionTitle icon={TrendingUp}>Tela 3 — Simulação com INCC</SectionTitle>

        <SubSection title="O que é o INCC?">
          <p>O INCC (Índice Nacional da Construção Civil) é a correção aplicada às parcelas de imóveis na planta. Funciona como uma "inflação da construção": suas parcelas sobem um pouquinho a cada mês, seguindo esse índice.</p>
          <Example>Uma parcela de R$ 1.000 com INCC de 0,5% no mês vira R$ 1.005. No mês seguinte, se o INCC for 0,3%, vira R$ 1.008. O efeito é acumulativo.</Example>
        </SubSection>

        <SubSection title="Escolher o ano base">
          <p>Selecione qual índice INCC usar:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2 mt-1">
            <li><strong>Média Histórica</strong> — média de 2019 a 2025. Cenário mais equilibrado.</li>
            <li><strong>Ano específico</strong> — usa os índices reais daquele ano. Cada ano teve um comportamento diferente.</li>
          </ul>
          <Example>2023 teve INCC baixo (cenário otimista). 2021 teve INCC muito alto por causa da pandemia (cenário pessimista).</Example>
        </SubSection>

        <SubSection title="Comparação automática">
          <p>A tela compara 3 cenários lado a lado:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2 mt-1">
            <li><strong>Menor</strong> — ano com menor INCC (melhor caso)</li>
            <li><strong>Média</strong> — média histórica (caso provável)</li>
            <li><strong>Maior</strong> — ano com maior INCC, excluindo 2021 (pior caso realista)</li>
          </ul>
        </SubSection>

        <SubSection title="Tabela mês a mês">
          <p>Tabela detalhada mostrando para cada mês: INCC aplicado, fator acumulado, parcela original vs. corrigida, valor da correção e total pago.</p>
          <Tip>Meses marcados como "projetado" usam estimativa baseada na média histórica, pois ainda não há dados reais.</Tip>
        </SubSection>

        {/* ===== EXEMPLOS PRATICOS ===== */}
        <SectionTitle icon={Sliders}>Passo a passo — Exemplos práticos</SectionTitle>

        <SubSection title="Exemplo 1: Simulação rápida (só mensais)">
          <StepList steps={[
            'Preencha o valor do imóvel (ex: R$ 750.000) e a data de entrega',
            'Em "Pagar até a Entrega", coloque 30%',
            'Em "Entrada Mínima", coloque 10%',
            'Deixe o "Valor Mensal" em branco — a calculadora distribui sozinha',
            'Clique "Calcular Simulações"',
            'Resultado: vários cenários comparando entradas de 10% a 30%, cada um com parcelas mensais diferentes'
          ]} />
        </SubSection>

        <SubSection title="Exemplo 2: Parcela mensal fixa">
          <StepList steps={[
            'Preencha valor e data de entrega',
            'Defina o "Pagar até a Entrega" e "Entrada Mínima"',
            'Em "Valor Mensal Desejado", coloque R$ 2.000,00',
            'A calculadora ajusta a entrada para fechar a conta',
            'Resultado: cenários onde a parcela é sempre R$ 2.000 e a entrada varia'
          ]} />
        </SubSection>

        <SubSection title="Exemplo 3: Mensais + Trimestrais automáticas">
          <StepList steps={[
            'Preencha dados básicos e os percentuais',
            'Ative "Contém intercaladas" e escolha "Trimestral"',
            'Deixe os dois valores (mensal e intercalada) em branco',
            'Ajuste o slider de proporção (ex: 60% mensais / 40% intercaladas)',
            'Resultado: vários cenários com parcelas mensais menores + trimestrais maiores'
          ]} />
        </SubSection>

        <SubSection title="Exemplo 4: Apresentação para cliente (modo Porcentagens)">
          <StepList steps={[
            'Troque para modo "Porcentagens"',
            'Crie 3 combinações: opção conservadora (30% entrada), equilibrada (20%) e acessível (10%)',
            'Preencha os % de parcelas e intercaladas em cada uma',
            'Calcule — cada combinação gera um cenário fixo',
            'Na tela de resultados, ajuste valores com [-][+] se necessário',
            'Selecione os cenários desejados e exporte o relatório'
          ]} />
        </SubSection>

        <SubSection title="Exemplo 5: Análise de impacto do INCC">
          <StepList steps={[
            'Gere qualquer simulação',
            'Na tela de resultados, clique em "Simular INCC" no cenário desejado',
            'Compare os 3 cenários automáticos (menor, média, maior)',
            'Troque o ano base para ver diferentes comportamentos do INCC',
            'Use a tabela mês a mês para mostrar ao cliente a evolução real das parcelas'
          ]} />
        </SubSection>

        {/* ===== VALIDACOES ===== */}
        <SectionTitle icon={Percent}>Limites e validações</SectionTitle>
        <div className="text-sm text-ink-muted">
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Valor do imóvel deve ser maior que zero</li>
            <li>Data de entrega: mínimo 6 meses no futuro</li>
            <li>Entrada mínima não pode ser maior que o % a pagar até a entrega</li>
            <li>Entrada + mensais + intercaladas não pode ultrapassar o total até entrega</li>
            <li>No modo porcentagens: soma de cada combinação deve ser de no máximo 100%</li>
            <li>Combinações duplicadas são rejeitadas</li>
            <li>Incremento: 1% a 100%. Simulações: 1 a 50.</li>
          </ul>
        </div>

        {/* ===== DICAS ===== */}
        <SectionTitle icon={Sparkles}>Dicas</SectionTitle>
        <div className="space-y-2">
          <Tip>Use "Gerar valores de teste" para entender rapidamente como a calculadora funciona antes de inserir dados reais.</Tip>
          <Tip>Os dados do corretor ficam salvos no navegador. Cadastre uma vez e eles aparecem automaticamente em todas as simulações.</Tip>
          <Tip>Na tela de resultados, ajuste os valores diretamente nos cards com [-][+] para personalizar cenários sem voltar ao formulário.</Tip>
          <Tip>Desmarque cenários que não interessam antes de exportar o relatório — ele ficará mais limpo e focado.</Tip>
          <Tip>Na comparação de INCC, 2021 foi excluído do cálculo de "maior" por ser atípico (pandemia + inflação extrema na construção).</Tip>
        </div>

      </div>
    </Modal>
  );
}
