# Integração Mercado Pago — Setup

Fluxo implementado: **cadastro → `/assinar` → botão "Assinar" → checkout hospedado do
Mercado Pago (assinatura/preapproval) → webhook grava em `subscriptions` → acesso liberado**.
As rotas `/calculadora/*` agora exigem assinatura ativa (`RequireSubscription`).

## Peças

| Arquivo | Papel |
|---|---|
| `netlify/functions/subscription-create.js` | `POST /api/subscription/create` — valida o login (token Supabase), cria a preapproval no MP e devolve a URL do checkout |
| `netlify/functions/mp-webhook.js` | `POST /api/webhooks/mercadopago` — recebe notificações, consulta a preapproval e faz upsert em `subscriptions` |
| `supabase/migrations/20260817_mercadopago.sql` | Colunas `gateway` e `gateway_subscription_id` + índice único |
| `src/utils/subscriptionApi.js` | Chamada do front para criar o checkout |
| `src/components/Assinar.jsx` | Página de planos com checkout real (mostra plano atual se já assinante) |
| `src/components/AssinarRetorno.jsx` | `/assinar/retorno` — aguarda o webhook confirmar (polling ~90s) |

## Passo a passo para ativar

### 1. Rodar a migração no Supabase

SQL Editor → colar e executar `supabase/migrations/20260817_mercadopago.sql`.
Inclui (comentado) o SQL para dar assinatura vitalícia à conta do fundador —
**recomendado rodar antes de deployar o gating**, senão sua própria conta cai no paywall.

Conferir também a CHECK constraint de `status` (instruções no próprio arquivo):
precisa aceitar `active`, `past_due`, `canceled`, `trialing`.

### 2. Credenciais do Mercado Pago

1. [painel de desenvolvedor](https://www.mercadopago.com.br/developers/panel/app) → criar aplicação (tipo "Pagamentos online", modelo "Assinaturas").
2. Copiar o **Access Token** (começar pelas credenciais de **teste**; produção depois).
3. Em **Webhooks** (na aplicação): cadastrar a URL
   `https://fluxo-pro-783.netlify.app/api/webhooks/mercadopago`
   com os eventos **Planos e assinaturas** (`subscription_preapproval` e
   `subscription_authorized_payment`). Copiar a **assinatura secreta** gerada.

### 3. Variáveis de ambiente no Netlify (site de produção `fluxo-pro-783`)

> ⚠️ Seguir o runbook `docs/netlify-deploys.md`: `netlify status` antes de qualquer `env:set`.

```bash
netlify env:set MP_ACCESS_TOKEN "APP_USR-... (ou TEST-...)"
netlify env:set MP_WEBHOOK_SECRET "<assinatura secreta do webhook>"
netlify env:set SUPABASE_URL "https://ubjfklkfvurtttkazini.supabase.co"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "<service role do Supabase — Settings → API>"
```

Todas são **runtime** (lidas pelas functions) — não exigem rebuild para valer,
mas o gating do front (`RequireSubscription`) entra no próximo deploy.

O site **demo** não precisa de nada disso (modo aberto ignora o gating).

### 4. Testar em sandbox

1. Com o Access Token de **teste**, criar um usuário de teste comprador
   (painel MP → Contas de teste) ou usar cartões de teste
   (`5031 4332 1540 6351`, CVV 123, venc. 11/30, nome APRO).
2. Cadastro novo no site → `/assinar` → Assinar → pagar com o cartão de teste.
3. `/assinar/retorno` deve confirmar em segundos (webhook → `subscriptions`).
4. Conferir no Supabase: `select * from subscriptions order by created_at desc;`
5. Trocar para o Access Token de **produção** quando validar.

## Mapeamento de status (webhook)

| Mercado Pago | `subscriptions.status` | Acesso |
|---|---|---|
| `authorized` | `active` | ✅ liberado |
| `paused` | `past_due` | ❌ (isActive exige active/trialing) |
| `cancelled` | `canceled` | ❌ |
| `pending` | *(não grava)* | ❌ |

- Renovações (`subscription_authorized_payment`) re-consultam a preapproval e
  atualizam `current_period_end` (= `next_payment_date` do MP).
- `plans.trial_days > 0` vira `free_trial` na preapproval (trial gerido pelo MP;
  hoje os planos estão com 0).
- Plano anual = cobrança a cada 12 meses (MP não tem `frequency_type: years`).

## Pendências conhecidas

- **Cancelamento pelo app**: ainda não há botão "cancelar assinatura" (fazer via
  API `PUT /preapproval/{id}` com `status: cancelled` — próxima iteração).
- **Troca de plano**: não implementada (cancelar + assinar de novo).
- **Nota fiscal**: emissão automática implementada (Notaas → Asaas) — ver
  `docs/nfse-setup.md`. O webhook agora também registra cada cobrança aprovada
  em `invoices`, e o checkout exige CPF/CNPJ (`billing_profiles`).
