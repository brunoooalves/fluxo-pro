import React from 'react';
import { Link } from 'react-router-dom';
import { Calculator, LogOut } from 'lucide-react';
import Button from './ui/Button';
import PlansSection from './PlansSection';
import { useAuth } from '../context/AuthContext';

/**
 * Página de planos / assinatura (rota pública /assinar).
 * Os cards vêm da seção reutilizável PlansSection.
 */
export default function Assinar() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-surface-base px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center">
              <Calculator size={18} />
            </div>
            <span className="text-lg font-bold text-ink-base">Fluxo Pro</span>
          </Link>
          {user && (
            <Button variant="ghost" size="sm" icon={<LogOut size={14} />} onClick={() => signOut()}>
              Sair
            </Button>
          )}
        </header>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-ink-base">Escolha seu plano</h1>
          <p className="text-ink-muted mt-2">Assine para usar a calculadora sem limites.</p>
        </div>

        <PlansSection />

        <p className="text-center text-xs text-ink-faint mt-8">
          O pagamento será habilitado quando o gateway estiver integrado.
        </p>
      </div>
    </div>
  );
}
