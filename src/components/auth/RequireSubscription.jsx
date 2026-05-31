import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';

/**
 * Exige assinatura ativa (trial/active). Sem assinatura → manda para /assinar.
 *
 * AINDA NÃO está aplicado nas rotas (ver App.js): o gating por assinatura só
 * deve ser ligado depois que o checkout do gateway estiver funcionando, senão
 * ninguém consegue acessar. Para ativar, envolva a rota:
 *   <RequireAuth><RequireSubscription><MortgageCalculator/></RequireSubscription></RequireAuth>
 */
export default function RequireSubscription({ children }) {
  const { isActive, loading } = useSubscription();

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
