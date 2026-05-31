import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * AuthContext — estado global de autenticação via Supabase.
 *
 * Expõe: session, user, loading, isConfigured, signUp, signIn, signOut.
 * Quando o Supabase ainda não está configurado (sem env), fica em modo
 * "aberto": loading=false e user=null, e os guards liberam o acesso.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback((email, password, fullName) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    }), []);

  const signIn = useCallback((email, password) =>
    supabase.auth.signInWithPassword({ email, password }), []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  // Exclusão de conta (LGPD). Chama a função SECURITY DEFINER no banco, que
  // apaga apenas a própria conta (auth.uid()); o cascade limpa profiles,
  // subscriptions e payments. Em seguida encerra a sessão.
  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.rpc('delete_own_account');
    if (error) throw error;
    await supabase.auth.signOut();
  }, []);

  const value = {
    session,
    user,
    loading,
    isConfigured: isSupabaseConfigured,
    signUp,
    signIn,
    signOut,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
