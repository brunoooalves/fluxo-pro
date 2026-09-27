import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';

/**
 * Exige assinatura ativa (trial/active). Sem assinatura → manda para /assinar.
 *
 * No modo aberto (Supabase não configurado, ex.: site demo) libera tudo,
 * igual ao RequireAuth.
 */
export default function RequireSubscription({ children }) {
  const { isConfigured } = useAuth();
  const { isActive, loading } = useSubscription();

  if (!isConfigured) return children;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base">
        <Loader2 className="animate-spin text-brand-500" size={28} />
      </div>
    );
  }

  if (!isActive) {
    return <Navigate to="/assinar" replace />;
  }

  return children;
}
