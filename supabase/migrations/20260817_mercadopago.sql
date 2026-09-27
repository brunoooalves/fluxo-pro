-- Integração Mercado Pago — colunas de gateway em `subscriptions`.
-- Rodar no SQL Editor do Supabase (idempotente: pode rodar mais de uma vez).

alter table public.subscriptions
  add column if not exists gateway text not null default 'mercadopago',
  add column if not exists gateway_subscription_id text;

-- O webhook faz upsert por gateway_subscription_id (on_conflict) — precisa ser único.
create unique index if not exists subscriptions_gateway_subscription_id_key
  on public.subscriptions (gateway_subscription_id);

-- ---------------------------------------------------------------------------
-- CONFERIR: se `status` tiver CHECK constraint, ela precisa aceitar os valores
-- usados pelo webhook: 'active', 'past_due', 'canceled' (e 'trialing', já usado
-- pelo app). Inspecione com:
--
--   select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--   where conrelid = 'public.subscriptions'::regclass;
--
-- Se faltar algum valor, recrie a constraint incluindo-o.
-- ---------------------------------------------------------------------------

-- OPCIONAL — conceder assinatura vitalícia à conta do fundador (para não se
-- trancar fora quando o gating por assinatura for ativado):
--
-- insert into public.subscriptions (user_id, plan_id, status, gateway, current_period_end)
-- select u.id, p.id, 'active', 'founder', now() + interval '100 years'
-- from auth.users u
-- cross join public.plans p
-- where u.email = 'brunooo.alves@gmail.com'
--   and p.code = 'pro_mensal'
--   and not exists (
--     select 1 from public.subscriptions s
--     where s.user_id = u.id and s.status in ('active', 'trialing')
--   );
