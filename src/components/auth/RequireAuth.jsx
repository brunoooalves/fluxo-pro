import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Protege uma rota: exige usuário logado.
 *
 * Enquanto o Supabase não estiver configurado (sem env), o app continua
 * ABERTO — exatamente como hoje. Assim que as chaves forem definidas, o
 * gating passa a valer e visitantes sem login vão para /login.
 */
export default function RequireAuth({ children }) {
  const { user, loading, isConfigured } = useAuth();
  const location = useLocation();

  if (!isConfigured) return children;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base">
        <Loader2 className="animate-spin text-brand-500" size={28} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
