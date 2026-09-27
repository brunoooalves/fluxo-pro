# NFS-e automática — Setup

Fluxo implementado: **cobrança aprovada no Mercado Pago → webhook grava a nota em
`invoices` → emissor (Notaas, com Asaas de reserva) emite a NFS-e → webhook do
emissor grava número, PDF e XML → assinante vê em `/calculadora/notas`**.

Decisão (2026-09-09): emissor principal **Notaas** (plano gratuito, 50 notas/mês,
R$ 0,50 a excedente) e reserva **Asaas** (R$ 0,49 por nota, sem mensalidade).
O código é agnóstico: trocar de emissor é mexer em `NFSE_PROVIDERS`.

## Peças

| Arquivo | Papel |
|---|---|
| `supabase/migrations/20260909_nfse.sql` | Tabelas `billing_profiles` (tomador), `invoices` (uma por pagamento), `invoice_events` (auditoria) |
| `netlify/functions/lib/supabase.js` | Cliente REST mínimo do Supabase (service role) |
| `netlify/functions/lib/nfse/index.js` | Orquestrador: registra pagamento, escolhe emissor, failover, retentativa, reconciliação |
| `netlify/functions/lib/nfse/providers/notaas.js` | Adaptador Notaas (emitir, consultar, cancelar, validar webhook) |
| `netlify/functions/lib/nfse/providers/asaas.js` | Adaptador Asaas (cliente + nota avulsa, consultar, cancelar, validar webhook) |
| `netlify/functions/mp-webhook.js` | Agora também: pagamento aprovado → `recordPaidInvoice` + `processInvoice` |
| `netlify/functions/nfse-webhook.js` | `POST /api/webhooks/nfse/:provider` — retorno dos emissores |
| `netlify/functions/nfse-retry.js` | Agendada (`@hourly`): reprocessa pendentes/erros e reconcilia `processing` |
| `netlify/functions/subscription-create.js` | Recusa checkout sem CPF/CNPJ (`412 billing_profile_required`) |
| `src/utils/billingProfile.js` | Validação CPF/CNPJ, ViaCEP, leitura/gravação de `billing_profiles` |
| `src/components/BillingProfileForm.jsx` | Formulário de dados fiscais (modal em `/assinar` e em `/calculadora/notas`) |
| `src/components/Assinar.jsx` | Pede os dados fiscais antes de abrir o checkout |
| `src/components/MinhasNotas.jsx` | `/calculadora/notas` — lista de notas com PDF/XML + edição dos dados fiscais |

## Ciclo de vida de uma nota (`invoices.status`)

```
pending ──emitir──► processing ──webhook/reconciliação──► issued
   │                    │                                   
   └──falha──► error ◄──┘ (rejeição do emissor)
                 │
                 └── nfse-retry (backoff 5m, 30m, 2h, 6h, 24h) ── até NFSE_MAX_ATTEMPTS (8)
```

- **Idempotência**: `(gateway, gateway_payment_id)` é único. O MP pode reenviar o
  webhook à vontade; a segunda vez não cria nota.
- **Failover**: `NFSE_PROVIDERS="notaas,asaas"`. As primeiras
  `NFSE_FAILOVER_AFTER_ATTEMPTS` (2) tentativas vão para o Notaas; da terceira em
  diante, Asaas. Para forçar um só: `NFSE_PROVIDERS="asaas"`.
- **Sem CPF/CNPJ**: a nota fica em `error` com mensagem clara e é reavaliada a
  cada 6h (não consome tentativa). O checkout já bloqueia esse caso; só acontece
  para assinantes anteriores a esta versão.
- **Esgotou tentativas**: fica em `error` para tratamento manual:
  `select id, user_id, amount_cents, provider, error_message from invoices where status = 'error';`

## Passo a passo para ativar

### 1. Definir com o contador (antes de tudo)

| Item | Onde entra |
|---|---|
| Código do serviço LC 116 (SaaS: normalmente **1.05** licenciamento de software, ou 1.03) | `NOTAAS_SERVICE_CODE` (formato nacional 6 dígitos, ex. `010501`) e `ASAAS_MUNICIPAL_SERVICE_CODE` (`1.05`) |
| Alíquota de ISS do município | `NFSE_ISS_RATE` (ex. `2`) |
| Regime (Simples Nacional?) e código de tributação municipal | Cadastro do prestador no painel de cada emissor; `NOTAAS_MUNICIPAL_TAX_CODE` se o município exigir |
| Valor da nota = bruto cobrado do cliente (a taxa do MP é despesa sua) | Já é assim: `transaction_amount` do MP |

### 2. Rodar a migração no Supabase

SQL Editor → executar `supabase/migrations/20260909_nfse.sql`. Ela assume que
`subscriptions.id` e `plans.id` são `uuid` (se não forem, ajustar as FKs).

### 3. Notaas (principal)

1. Criar conta em notaas.com.br, cadastrar o CNPJ prestador e o **certificado A1**.
2. Confirmar com o suporte que o seu município está atendido (padrão Nacional ou layout próprio homologado).
3. Dashboard → API Keys → **Nova Key** (projeto de produção). Guardar: só aparece uma vez.
4. Dashboard → Developers → Webhooks → endpoint
   `https://fluxo-pro-783.netlify.app/api/webhooks/nfse/notaas`
   com os eventos `nfse.issued`, `nfse.error`, `nfse.cancelled`, `nfse.documents_ready`
   e um **secret** (gerar um aleatório, ex. `openssl rand -hex 32`).
5. Emitir uma nota de teste pelo painel para validar o cadastro fiscal antes de ligar a automação.

### 4. Asaas (reserva)

1. Conta PJ no Asaas; menu **Notas fiscais → Configurações**: certificado A1, dados do
   município, cadastrar o **serviço municipal** (código + descrição).
2. **Integrações → API** → gerar a chave.
3. **Integrações → Webhooks** → URL `https://fluxo-pro-783.netlify.app/api/webhooks/nfse/asaas`,
   eventos de **Nota fiscal**, definir o **token de autenticação** (vai no header
   `asaas-access-token`).
4. Sandbox: `https://sandbox.asaas.com` tem conta separada; a API fica em
   `https://api-sandbox.asaas.com/v3` (`ASAAS_BASE_URL`).

### 5. Variáveis de ambiente no Netlify (site `fluxo-pro-783`)

> ⚠️ `netlify status` antes de qualquer `env:set` (ver `docs/netlify-deploys.md`).

```bash
# Orquestração
netlify env:set NFSE_PROVIDERS "notaas,asaas"
netlify env:set NFSE_ISS_RATE "2"
netlify env:set NFSE_SERVICE_DESCRIPTION "Assinatura Fluxo Pro - Plano {plano} - competencia {competencia}"

# Notaas
netlify env:set NOTAAS_API_KEY "ntaas_..."
netlify env:set NOTAAS_WEBHOOK_SECRET "<secret do webhook>"
netlify env:set NOTAAS_SERVICE_CODE "010501"
# opcionais, conforme exigência do município:
# netlify env:set NOTAAS_MUNICIPAL_SERVICE_CODE "..."
# netlify env:set NOTAAS_MUNICIPAL_TAX_CODE "..."
# netlify env:set NOTAAS_LOCAL_PRESTACAO "<IBGE do seu município>"

# Asaas
netlify env:set ASAAS_API_KEY "$aact_..."
netlify env:set ASAAS_BASE_URL "https://api.asaas.com/v3"
netlify env:set ASAAS_WEBHOOK_TOKEN "<token do webhook>"
netlify env:set ASAAS_MUNICIPAL_SERVICE_CODE "1.05"
netlify env:set ASAAS_MUNICIPAL_SERVICE_NAME "Licenciamento ou cessão de direito de uso de programas de computação"
# netlify env:set ASAAS_MUNICIPAL_SERVICE_ID "<id do serviço cadastrado no Asaas>"
```

Opcionais: `NFSE_FAILOVER_AFTER_ATTEMPTS` (2), `NFSE_MAX_ATTEMPTS` (8), `NOTAAS_BASE_URL`.
`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem (Mercado Pago).

### 6. Mercado Pago

No painel da aplicação, em **Webhooks**, manter **Planos e assinaturas** marcado.
O gatilho da nota é o evento `subscription_authorized_payment` com pagamento
`approved`. O evento `payment` também é tratado quando o pagamento vem com
`metadata.preapproval_id`; se o MP não enviar esse metadado, o evento é ignorado
sem efeito colateral (a dedupe é pelo id do pagamento).

### 7. Testar

1. Deploy. Conferir em **Functions** que `nfse-retry` aparece como *scheduled*.
2. Cadastro novo → `/assinar` → escolher plano → preencher CPF/CNPJ → pagar com cartão de teste do MP.
3. `select * from invoices order by created_at desc;` → linha `processing` com `provider = 'notaas'` e `provider_ref`.
4. Em segundos/minutos o webhook do Notaas fecha em `issued` com `pdf_url`.
5. `/calculadora/notas` mostra a nota com botão PDF.
6. Simular failover: `NFSE_PROVIDERS="asaas"` e disparar a retentativa manualmente:
   `curl -X POST https://fluxo-pro-783.netlify.app/.netlify/functions/nfse-retry`.

## Consultas úteis

```sql
-- notas travadas
select id, status, provider, attempts, error_message, next_attempt_at
from invoices where status <> 'issued' order by created_at desc;

-- histórico de uma nota
select created_at, provider, event, payload from invoice_events
where invoice_id = '<id>' order by created_at;

-- assinantes ativos sem dados fiscais (antigos)
select s.user_id from subscriptions s
left join billing_profiles b on b.user_id = s.user_id
where s.status = 'active' and b.user_id is null;
```

## Pendências conhecidas

- **Cancelamento/estorno**: `cancel()` existe nos adaptadores, mas ainda não é chamado.
  Chargeback exige cancelar a NFS-e dentro do prazo do município. Por ora, manual.
- **E-mail ao cliente**: hoje o cliente baixa o PDF em `/calculadora/notas`. Notaas e
  Asaas podem enviar por e-mail; ligar no painel do emissor se quiser.
- **Sandbox Notaas**: a documentação não descreve ambiente de homologação. Validar
  com uma nota real de valor baixo e cancelar.
