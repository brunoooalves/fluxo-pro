-- Emissão de NFS-e por pagamento aprovado (Notaas principal, Asaas reserva).
-- Rodar no SQL Editor do Supabase (idempotente: pode rodar mais de uma vez).

-- ---------------------------------------------------------------------------
-- 1. Dados fiscais do tomador (o assinante). Preenchido pelo próprio usuário
--    em /assinar antes do checkout; lido pelas functions via service role.
-- ---------------------------------------------------------------------------
create table if not exists public.billing_profiles (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  name               text not null,
  tax_id             text not null,                  -- CPF (11) ou CNPJ (14), só dígitos
  tax_id_type        text not null check (tax_id_type in ('cpf', 'cnpj')),
  email              text,
  cep                text,                           -- só dígitos
  logradouro         text,
  numero             text,
  complemento        text,
  bairro             text,
  cidade             text,
  uf                 text,
  ibge_code          text,                           -- código IBGE do município (7 dígitos)
  asaas_customer_id  text,                           -- cache do cliente criado no Asaas
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.billing_profiles enable row level security;

drop policy if exists "billing_profiles: usuário lê o próprio" on public.billing_profiles;
create policy "billing_profiles: usuário lê o próprio"
  on public.billing_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "billing_profiles: usuário cria o próprio" on public.billing_profiles;
create policy "billing_profiles: usuário cria o próprio"
  on public.billing_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "billing_profiles: usuário edita o próprio" on public.billing_profiles;
create policy "billing_profiles: usuário edita o próprio"
  on public.billing_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. Notas fiscais: uma linha por pagamento aprovado no gateway.
--    gateway_payment_id é a chave de idempotência (o MP reenvia webhooks).
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  subscription_id     uuid references public.subscriptions (id) on delete set null,
  plan_id             uuid references public.plans (id) on delete set null,
  gateway             text not null default 'mercadopago',
  gateway_payment_id  text not null,
  amount_cents        integer not null,
  currency            text not null default 'BRL',
  competence          date not null,                 -- 1º dia do mês de competência
  status              text not null default 'pending'
                      check (status in ('pending', 'processing', 'issued', 'error', 'canceled')),
  provider            text,                          -- notaas | asaas
  provider_ref        text,                          -- id da nota no emissor
  provider_status     text,                          -- status bruto devolvido pelo emissor
  invoice_number      text,
  verification_code   text,
  pdf_url             text,
  xml_url             text,
  error_message       text,
  attempts            integer not null default 0,
  next_attempt_at     timestamptz not null default now(),
  issued_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists invoices_gateway_payment_id_key
  on public.invoices (gateway, gateway_payment_id);

create unique index if not exists invoices_provider_ref_key
  on public.invoices (provider, provider_ref)
  where provider_ref is not null;

create index if not exists invoices_retry_idx
  on public.invoices (status, next_attempt_at)
  where status in ('pending', 'error', 'processing');

alter table public.invoices enable row level security;

drop policy if exists "invoices: usuário lê as próprias" on public.invoices;
create policy "invoices: usuário lê as próprias"
  on public.invoices for select
  using (auth.uid() = user_id);
-- Escrita só via service role (functions). Nenhuma policy de insert/update.

-- ---------------------------------------------------------------------------
-- 3. Trilha de eventos (webhooks recebidos, tentativas, erros) para auditoria.
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_events (
  id          bigserial primary key,
  invoice_id  uuid references public.invoices (id) on delete cascade,
  provider    text,
  event       text not null,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists invoice_events_invoice_idx on public.invoice_events (invoice_id);

alter table public.invoice_events enable row level security;
-- Sem policies: só service role lê/escreve.

-- ---------------------------------------------------------------------------
-- 4. updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists billing_profiles_set_updated_at on public.billing_profiles;
create trigger billing_profiles_set_updated_at
  before update on public.billing_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();
