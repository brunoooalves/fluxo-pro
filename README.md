# Fluxo Pro

Calculadora de financiamento imobiliário na planta. Simula planos de pagamento
(entrada, parcelas mensais e intercaladas), correção pelo INCC, projeção de
valorização (FipeZap) e gera relatórios em PDF e links compartilháveis.

Aplicação React standalone, extraída do portal imobiliário para deploy
independente no Netlify.

## Stack

- React 18 + React Router v6 (Create React App / react-scripts)
- Tailwind CSS 3.4 (design tokens em `src/design-system/tokens.css`)
- jsPDF (exportação de PDF), recharts (gráficos), qrcode.react (QR de compartilhamento)
- Netlify Functions v2 + Netlify Blobs (backend dos links compartilháveis)

## Desenvolvimento

```bash
npm install
npm start          # dev server em http://localhost:3000
```

As rotas usam o prefixo `/calculadora`; a raiz (`/`) redireciona para lá.

| Rota | Tela |
|------|------|
| `/calculadora` | Formulário de simulação |
| `/calculadora/resultados` | Comparação de cenários + customização + PDF |
| `/calculadora/resultados/incc` | Simulação de correção INCC |
| `/calculadora/relatorio` | Relatório público compartilhado (`?s=<id>`) |

> O recurso de compartilhamento (`/api/share/*`) depende das Netlify Functions.
> Para testá-lo localmente, use `netlify dev` em vez de `npm start`.

## Build

```bash
npm run build      # gera a pasta build/
```

## Deploy (Netlify)

O `netlify.toml` já está configurado (build, publish e functions). Deploy com o CLI:

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### Variáveis de ambiente (Netlify)

As funções de compartilhamento exigem:

- `SHARE_JWT_SECRET` — segredo para assinar os IDs dos links (obrigatório)
- `SHARE_TOKEN_EXPIRY_DAYS` — validade dos links em dias (opcional, padrão 7)

## Estrutura

```
src/
  App.js                       # rotas da calculadora
  index.js                     # entrypoint React
  index.css                    # Tailwind + tokens
  design-system/tokens.css     # CSS custom properties
  components/                   # componentes da calculadora
    ui/                         # biblioteca de UI compartilhada
    shared-report/              # componentes do relatório público
  data/                         # dados INCC e FipeZap
  hooks/useFipeZap.js
  utils/                        # shareUtils, imoveisSalvos, textUtils
netlify/functions/             # share-create / share-get (Netlify Blobs)
```
