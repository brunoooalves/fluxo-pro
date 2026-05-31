import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase (auth + banco).
 *
 * As chaves vêm de variáveis de ambiente do CRA (prefixo REACT_APP_).
 * Defina-as em `.env.local` (dev) e nas env vars do Netlify (produção):
 *   REACT_APP_SUPABASE_URL
 *   REACT_APP_SUPABASE_ANON_KEY
 *
 * A anon key é pública por design — quem protege os dados é o RLS no banco.
 */

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Supabase] Não configurado. Defina REACT_APP_SUPABASE_URL e ' +
    'REACT_APP_SUPABASE_ANON_KEY no .env.local. O app segue aberto (sem login) até lá.'
  );
}

// Placeholder válido evita que o createClient quebre o import quando ainda
// não há env configurada (o app continua funcionando como hoje).
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
