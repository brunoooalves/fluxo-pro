/**
 * Cliente mínimo da REST do Supabase (PostgREST) usando a service role.
 * Ignora RLS — usar só em functions, nunca no front.
 *
 * Todas as funções lançam SupabaseError em resposta não-2xx.
 */

export class SupabaseError extends Error {
  constructor(status, detail) {
    super(`Supabase ${status}: ${detail}`);
    this.name = 'SupabaseError';
    this.status = status;
  }
}

function env() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados');
  }
  return { url: SUPABASE_URL, key: SUPABASE_SERVICE_ROLE_KEY };
}

async function request(method, path, { body, prefer, headers = {} } = {}) {
  const { url, key } = env();
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new SupabaseError(resp.status, await resp.text());
  }
  if (resp.status === 204) return null;
  const text = await resp.text();
  return text ? JSON.parse(text) : null;
}

/** GET com filtros PostgREST já na query string (ex.: `invoices?id=eq.X&select=*`). */
export function sbSelect(pathWithQuery) {
  return request('GET', pathWithQuery);
}

/** Primeira linha ou null. */
export async function sbSelectOne(pathWithQuery) {
  const rows = await sbSelect(`${pathWithQuery}&limit=1`);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

/** INSERT devolvendo a(s) linha(s) criada(s). */
export function sbInsert(table, rows, { onConflict, ignoreDuplicates = false } = {}) {
  const query = onConflict ? `?on_conflict=${onConflict}` : '';
  const resolution = ignoreDuplicates ? 'resolution=ignore-duplicates,' : '';
  return request('POST', `${table}${query}`, {
    body: Array.isArray(rows) ? rows : [rows],
    prefer: `${resolution}return=representation`,
  });
}

/** UPSERT (merge) devolvendo as linhas. */
export function sbUpsert(table, rows, onConflict) {
  return request('POST', `${table}?on_conflict=${onConflict}`, {
    body: Array.isArray(rows) ? rows : [rows],
    prefer: 'resolution=merge-duplicates,return=representation',
  });
}

/** PATCH com filtro (ex.: `invoices?id=eq.X`). Devolve as linhas alteradas. */
export function sbUpdate(pathWithFilter, patch) {
  return request('PATCH', pathWithFilter, {
    body: patch,
    prefer: 'return=representation',
  });
}
