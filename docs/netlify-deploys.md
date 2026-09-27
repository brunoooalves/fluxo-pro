# Runbook de Deploys (Netlify) — Fluxo Pro

Guia operacional dos **dois sites** do projeto e o processo correto de deploy/env.
Escrito após um incidente de depuração com vários erros (documentados abaixo) para
que não se repitam.

---

## Os dois sites

| Ambiente | Site / URL | Site ID | Modo | Auth |
|----------|------------|---------|------|------|
| **Produção** | `fluxo-pro-783` · https://fluxo-pro-783.netlify.app | `34b24e50-d8a8-4eb9-996f-b14633e9df5a` | Gated | Exige login (Supabase) |
| **Demo** | `fluxo-pro-demo` · https://fluxo-pro-demo.netlify.app | `ec494984-6457-4907-ac24-81cad5d3fe8f` | Aberto | Sem login |

### O que define "gated" vs "aberto"
É **a presença das variáveis `REACT_APP_SUPABASE_URL` e `REACT_APP_SUPABASE_ANON_KEY` no build**:
- **Com** elas → `isSupabaseConfigured = true` → `RequireAuth` exige login, `/` mostra a landing. (**Produção**)
- **Sem** elas → modo aberto → `RequireAuth` libera tudo e `/` redireciona direto para `/calculadora`. (**Demo**)

Essas são variáveis **de build** do CRA (prefixo `REACT_APP_`): ficam **assadas no bundle** no momento do build. Mudar a env **não afeta** um deploy já publicado — só o próximo build.

### Variáveis de ambiente por site
| Variável | Produção (783) | Demo |
|----------|----------------|------|
| `REACT_APP_SUPABASE_URL` | ✅ | ❌ (não pode ter) |
| `REACT_APP_SUPABASE_ANON_KEY` | ✅ | ❌ (não pode ter) |
| `SHARE_JWT_SECRET` | ✅ | ✅ |
| `SHARE_TOKEN_EXPIRY_DAYS` | ✅ (7) | ✅ (7) |

`SHARE_JWT_SECRET` é **runtime** (lido pela Netlify Function de compartilhamento). Sem ela, `/api/share/*` retorna **500 "Server configuration error"**.

---

## ⚠️ Erros cometidos no incidente (para não repetir)

1. **Não conferi qual site estava linkado antes de mexer em env.**
   Os comandos `netlify env:*` agem sobre o **site LINKADO** (`netlify status`), **não** de forma confiável sobre o `--site`. A pasta estava linkada na **produção (783)** o tempo todo.

2. **Confiei no `--site <id>` para comandos de env.** `netlify env:list --site demo` deu `Not Found` e `env:set --site demo` reportou sucesso mas caiu na 783. → O **demo nunca recebeu o `SHARE_JWT_SECRET`**, por isso a função dele dava 500.

3. **Rodei `netlify env:unset REACT_APP_SUPABASE_*` achando que era o demo — era a produção.** Apaguei as chaves do Supabase **da produção**. Só não derrubou o site porque o bundle live já tinha as chaves assadas; um rebuild teria quebrado o login.

4. **Sobrescrevi o `SHARE_JWT_SECRET` da produção** várias vezes (era o site linkado), o que poderia invalidar links de compartilhamento já gerados. Tive que restaurar o valor original.

5. **Usei `--no-build`** (deploy de pasta pré-buildada) misturado com builds normais, o que **atrapalhou o diagnóstico** e me fez perseguir uma pista falsa ("cache de função").

6. **Buildei localmente com `.env.local` presente**, que assa as chaves do Supabase no bundle (gated), exigindo um workaround frágil (`$env:REACT_APP_SUPABASE_*=''`).

7. **Demorei a checar o básico** (`netlify status` + env real de cada site por ID). A causa raiz (env no site errado) só apareceu quando fui ver o site linkado.

> **Lição central:** comandos de env do Netlify agem no **site linkado**. Sempre `netlify status` primeiro; para mexer em outro site, **linke nele de verdade** (`unlink` + `link --id`) e confirme no `status`.

---

## ✅ Processo correto

### Regra de ouro
Antes de qualquer `env:*` ou deploy:
```bash
netlify status   # confirme "Project URL/Id" = o site que você quer
```
Para trocar de site (o `link --id` às vezes não troca de primeira):
```bash
netlify unlink
netlify link --id <SITE_ID>
netlify status   # confirme que trocou
```

### Deploy de PRODUÇÃO (gated)
```bash
# 1. Linkar na produção e conferir
netlify unlink; netlify link --id 34b24e50-d8a8-4eb9-996f-b14633e9df5a
netlify status

# 2. Garantir as 4 envs (só se faltarem)
netlify env:set REACT_APP_SUPABASE_URL "https://ubjfklkfvurtttkazini.supabase.co"
netlify env:set REACT_APP_SUPABASE_ANON_KEY "sb_publishable_..."
netlify env:set SHARE_JWT_SECRET "<segredo-de-producao>"
netlify env:set SHARE_TOKEN_EXPIRY_DAYS 7

# 3. Deploy (o .env.local local também tem o Supabase, então o build sai gated)
netlify deploy --prod --build
```
**Verificar:** bundle **contém** a URL do Supabase (gated) e `/api/share/create` → 200.

### Deploy do DEMO (aberto, sem login)
O demo **não pode** ter `REACT_APP_SUPABASE_*` no env. Mas atenção ao **gotcha**: `netlify deploy --build` roda o build **localmente** e lê o `.env.local` (que tem o Supabase de produção) → sairia **gated**. Por isso forçamos modo aberto via shell:

```bash
# 1. Linkar no demo e conferir
netlify unlink; netlify link --id ec494984-6457-4907-ac24-81cad5d3fe8f
netlify status

# 2. Env do demo: só share, NUNCA Supabase
netlify env:set SHARE_JWT_SECRET "<segredo-do-demo>"
netlify env:set SHARE_TOKEN_EXPIRY_DAYS 7
# (se houver Supabase no demo por engano: netlify env:unset REACT_APP_SUPABASE_URL / _ANON_KEY)

# 3. Deploy FORÇANDO modo aberto (env vazia vence o .env.local no CRA)
$env:REACT_APP_SUPABASE_URL=''
$env:REACT_APP_SUPABASE_ANON_KEY=''
netlify deploy --prod --build

# 4. Religar na produção (estado padrão, evita acidentes)
netlify unlink; netlify link --id 34b24e50-d8a8-4eb9-996f-b14633e9df5a
```
> Por que o `$env:...=''` funciona: o `dotenv` do CRA **não sobrescreve** variáveis já presentes em `process.env`. Setando vazio no shell, o `.env.local` é ignorado para essas chaves → build aberto.
>
> Alternativa: renomear `.env.local` temporariamente antes do build e restaurar depois.

---

## Checklist de verificação pós-deploy (sempre)

```powershell
# Modo (aberto x gated): a URL do Supabase aparece no bundle?
$base = "https://<site>.netlify.app"
$resp = Invoke-WebRequest $base -UseBasicParsing
$js = ([regex]::Match($resp.Content,'main\.[a-z0-9]+\.js')).Value
$bundle = (Invoke-WebRequest "$base/static/js/$js" -UseBasicParsing).Content
$bundle -match 'ubjfklkfvurtttkazini'   # PROD: True (gated) | DEMO: False (aberto)

# Share funciona? (function lendo o SHARE_JWT_SECRET)
Invoke-WebRequest "$base/api/share/create" -Method POST -Body '{"data":"dGVzdGU="}' `
  -ContentType 'application/json' -SkipHttpErrorCheck -UseBasicParsing
# 200 + {"id":"..."} = OK | 500 "Server configuration error" = falta SHARE_JWT_SECRET no site
```

| Esperado | Produção | Demo |
|----------|----------|------|
| Supabase no bundle | **True** (gated) | **False** (aberto) |
| `/api/share/create` | 200 | 200 |
| `/` (raiz) | landing | redireciona p/ `/calculadora` |

---

## Notas

- **`.env.local`** (gitignored) guarda as chaves do Supabase para `npm start` local. Ele **vaza** para builds locais (`--build`) — daí o cuidado no demo.
- Variáveis `REACT_APP_*` são **build-time** (assadas no bundle); `SHARE_JWT_SECRET`/`SHARE_TOKEN_EXPIRY_DAYS` são **runtime** (lidas pela function).
- Sempre passe/—confirme o site certo. Em caso de dúvida: `netlify status`.
