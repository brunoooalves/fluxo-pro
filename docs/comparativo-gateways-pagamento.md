# Comparativo de Gateways de Pagamento — Fluxo Pro

> Documento de apoio à decisão. **Valores de taxas são aproximados e mudam com frequência** (muitos são negociáveis por volume) — confirme na página oficial de cada provedor antes de fechar. Pontos fiscais devem ser validados com um contador.

---

## Contexto do produto

- **Fluxo Pro**: SaaS por **assinatura** (recorrência) voltado a corretores de imóveis.
- **Ticket**: R$ 30–40/mês.
- **Mercado**: Brasil. **PIX é o trilho mais barato** e o **Pix Automático** (recorrência via PIX, em vigor desde 2026) muda o jogo — ~1,2–1,5% e **sem chargeback nem churn por cartão vencido**.
- **Premissa central**: em ticket baixo, **tarifa fixa por transação pesa muito**. Priorizar % baixa + PIX.

Custo aproximado de **uma cobrança de R$ 35** por trilho:

| Trilho | Custo aprox. | % efetivo |
|--------|--------------|-----------|
| PIX (gateway local) | ~R$ 0,46 | ~1,3% |
| Cartão (gateway local) | ~R$ 1,40 | ~4% |
| MoR (Hotmart/Kiwify) | ~R$ 4,50 | ~13% |

---

## Resumo executivo

**Existem dois modelos diferentes**, e a escolha começa por aqui:

1. **Gateway local** (Asaas, Efí, etc.) — *você* é o vendedor. Taxa baixa (~1,5–4%), **mas você assume a operação fiscal**: CNPJ, emitir nota fiscal por cobrança e recolher impostos.
2. **Merchant of Record / MoR** (Hotmart, Kiwify) — *a plataforma* é a vendedora. Taxa alta (~10%), **mas ela cuida de nota fiscal ao consumidor, impostos do varejo e chargeback**. Você só recebe o repasse.

**Recomendação:**

- **Para escalar com margem** (cenário-alvo de um SaaS de ticket baixo): **gateway local PIX-first — Asaas ou Efí** — com cartão como fallback, e **ativar o Pix Automático** assim que possível. É o que preserva melhor a margem.
- **Para lançar rápido sem montar a operação fiscal agora**: um **MoR (Hotmart)** resolve o fiscal ao custo de ~10% e é uma estratégia legítima de início ("começo no MoR, migro para gateway local quando o volume justificar").
- **O marketplace de afiliados da Hotmart NÃO é um bom impulsionador** para um produto B2B de nicho como o nosso — as vendas virão de atacar corretores diretamente, não de afiliados.

### Tabela-resumo

| Opção | Modelo | Custo aprox. (verificar) | Melhor para |
|-------|--------|--------------------------|-------------|
| **Asaas** ⭐ | Local | PIX ~1,49% · cartão ~3,2–3,99% · sem mensalidade | Melhor custo-benefício para começar |
| **Efí Bank** ⭐ | Local | PIX 1,19% · cartão 3,49% · sem mensalidade | PIX baratíssimo + Pix Automático |
| **Stripe** | Local | Cartão 3,99% + R$0,39 · Billing +0,7% | DX de classe mundial / ambição internacional |
| **Mercado Pago** | Local | Cartão recorrente ~3,99% (30d) | Confiança/conversão do público BR |
| **Vindi** | Local | Mensalidade + % (sob cotação) | Recorrência em escala (dunning/retry) |
| **Iugu** | Local | % por método (mid-tier) | Recorrência/marketplace com API robusta |
| **Superlógica** | Local | Plataforma (cotação) | Operação financeira de SaaS completa |
| **Pagar.me** (Stone) | Local | Plano pronto 5,59% + R$0,99 | Só com volume e taxa negociada |
| **Galax Pay** (Celcoin) | Local | Competitivo, foco recorrência | Alternativa enxuta SaaS-friendly |
| **Hotmart** | MoR | 9,9% + R$1 | Lançar rápido sem operação fiscal |
| **Kiwify** | MoR | 8,99% + R$2,49 | Idem; pior em ticket baixo (fixo alto) |
| **Paddle / Lemon Squeezy** | MoR intl | ~5% + taxa fixa | Vender fora do Brasil |

---

## Detalhamento por opção

### Grupo A — Gateways locais (você é o vendedor)

#### 1. Asaas ⭐
- **O que é**: conta digital + gateway brasileiro, popular em PMEs e SaaS de ticket baixo.
- **Taxas (aprox.)**: PIX ~1,49% (ou tarifa fixa ~R$1,99); cartão ~3,2–3,99%; **sem mensalidade**. Emite **nota fiscal** integrada.
- **Prós**: barato no ticket baixo, API simples, recorrência nativa, NF integrada.
- **Contras**: marca menos "premium" que Stripe; recursos avançados de dunning menores que Vindi.
- **Melhor para**: **começar** com o melhor custo-benefício.

#### 2. Efí Bank (ex-Gerencianet) ⭐
- **O que é**: banco/gateway com foco em PIX e cobrança recorrente.
- **Taxas (aprox.)**: PIX **1,19%**; cartão **3,49%**; **sem mensalidade**; suporta **Pix Automático**.
- **Prós**: PIX baratíssimo, ótima documentação/API, recorrência por cartão/boleto.
- **Contras**: ecossistema menor que Mercado Pago/Stripe.
- **Melhor para**: estratégia **PIX-first** com tarifa mínima.

#### 3. Stripe
- **O que é**: líder global em pagamentos online; melhor experiência de desenvolvedor (DX) e produto de assinaturas (Stripe Billing).
- **Taxas (aprox.)**: cartão **3,99% + R$0,39** (doméstico); **Billing add-on 0,7%**; PIX 1,19% (sob convite).
- **Prós**: DX e produto de billing excelentes; ideal se mirar fora do BR.
- **Contras**: **PIX recorrente fraco no Brasil**; cartão tem chargeback/churn de cartão vencido.
- **Melhor para**: produto **card-first** ou com ambição internacional.

#### 4. Mercado Pago
- **O que é**: maior carteira/checkout do Brasil; tem produto de **Assinaturas**.
- **Taxas (aprox.)**: cartão recorrente **3,99%** (recebimento em 30 dias) / 4,49% / 4,99%; aceita PIX e boleto na assinatura.
- **Prós**: confiança e conversão altíssimas no público BR; sem setup.
- **Contras**: taxa de cartão não é a menor; ecossistema "fechado".
- **Melhor para**: **conversão** com público amplo/B2C.

#### 5. Vindi
- **O que é**: especialista brasileiro em **recorrência/assinaturas**.
- **Taxas**: comercial (mensalidade + %), sob cotação.
- **Prós**: régua de inadimplência (**dunning**), retry automático, Pix Automático, multi-gateway.
- **Contras**: custo fixo mensal; faz sentido com volume.
- **Melhor para**: reduzir **churn involuntário** quando a base crescer.

#### 6. Iugu
- **O que é**: gateway/recorrência para SaaS e marketplaces.
- **Taxas**: % por método (mid-tier).
- **Prós**: API completa (cartão/PIX/boleto/carnê), bom para split/marketplace.
- **Contras**: custo intermediário.
- **Melhor para**: recorrência com necessidades de marketplace.

#### 7. Superlógica
- **O que é**: plataforma de **billing + gestão financeira** para negócios de recorrência.
- **Taxas**: modelo de plataforma (cotação), mais caro.
- **Prós**: cobrança, régua de inadimplência, integração de NF, métricas (MRR/churn) — operação completa.
- **Contras**: mais caro/robusto demais para o início.
- **Melhor para**: quando a **operação financeira** virar dor.

#### 8. Pagar.me (Stone)
- **O que é**: gateway robusto do grupo Stone; API v5 de recorrência.
- **Taxas (aprox.)**: plano pronto **5,59% + R$0,99** (alto p/ ticket baixo); custom negociável por volume.
- **Prós**: robustez, infraestrutura Stone.
- **Contras**: caro no plano padrão; só compensa com **taxa negociada**.
- **Melhor para**: operações com **volume** e contrato negociado.

#### 9. Galax Pay (Celcoin)
- **O que é**: gateway nichado em **cobrança recorrente**.
- **Taxas**: competitivas, foco em assinatura.
- **Prós**: retry automático, SaaS-friendly.
- **Contras**: menos conhecido; ecossistema menor.
- **Melhor para**: alternativa enxuta de recorrência.

### Grupo B — Plataformas MoR (a plataforma é a vendedora)

> No MoR, a **plataforma emite a nota fiscal ao consumidor e recolhe o imposto do varejo**; você recebe um **repasse** e acerta o fiscal com **uma única entidade**. Não elimina seu imposto — **transfere a complexidade** (emitir NF por cobrança, tributo do varejo). Bom para lançar sem montar a operação fiscal.

#### 10. Hotmart
- **O que é**: maior plataforma de **infoprodutos** do Brasil; funciona como MoR; suporta assinatura com PIX/cartão/boleto.
- **Taxas**: **9,9% + R$1** por venda (a taxa do "Player" só incide se hospedar vídeo — não é o nosso caso). No ticket R$35 ≈ **R$4,47 (~12,8%)**.
- **Prós**: **cuida de NF, imposto e chargeback**; checkout/recuperação de carrinho; aceita MEI/CNPJ.
- **Contras**: **taxa alta** para ticket baixo; é centrada em **conteúdo/curso** (para um SaaS externo, usa-se só como cobrança, com checkout fora do site + webhook para liberar acesso); **afiliados não ajudam produto de nicho**.
- **Melhor para**: **lançar rápido** sem operação fiscal própria.

#### 11. Kiwify
- **O que é**: concorrente direto da Hotmart no mercado de infoprodutos; também MoR.
- **Taxas**: **8,99% + R$2,49** por venda. No ticket R$35 ≈ **R$5,64 (~16%)** — o **fixo de R$2,49 penaliza ticket baixo**, ficando pior que a Hotmart aqui.
- **Prós**: % ligeiramente menor; bom para ticket médio/alto; mesma vantagem de MoR.
- **Contras**: **fixo alto** mata ticket baixo; mesmo descompasso de "plataforma de conteúdo".
- **Melhor para**: produtos de **ticket médio/alto** (não é o nosso caso).

#### 12. Paddle / Lemon Squeezy (MoR internacional)
- **O que é**: MoRs globais focados em SaaS; viram "seller of record" e cuidam de **imposto/VAT global**.
- **Taxas**: ~**5% + taxa fixa**.
- **Prós**: compliance fiscal global; ótimos se vender para fora.
- **Contras**: **fracos em PIX/boleto** (ruins para público 100% Brasil); cobram em USD.
- **Melhor para**: **venda internacional**, não para um público só brasileiro.

---

## Conclusão e próximo passo sugerido

1. **Decisão fiscal primeiro**: vamos montar operação própria (CNPJ + NF + imposto, via gateway local) ou terceirizar via MoR no início? → conversar com **contador** (incluindo se SaaS cabe em MEI — provavelmente não, por causa do CNAE).
2. **Se gateway local**: começar com **Asaas ou Efí** (PIX-first, sem mensalidade, NF integrada) + cartão fallback; ativar **Pix Automático**.
3. **Se MoR para lançar rápido**: **Hotmart** (mais barata que Kiwify no nosso ticket), migrando para local quando o volume justificar.

> **Não contar com afiliados** (Hotmart) como motor de vendas para um produto B2B de nicho.
