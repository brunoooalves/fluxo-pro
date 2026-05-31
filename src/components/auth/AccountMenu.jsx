import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

/**
 * Identificação do usuário logado + logout.
 * Renderiza nada quando não há login configurado/ativo.
 *
 * (Exclusão de conta — LGPD — será adicionada server-side junto com as
 * funções de pagamento, para também cancelar a assinatura no gateway.)
 */
export default function AccountMenu() {
  const { user, isConfigured, signOut } = useAuth();
  const navigate = useNavigate();

  if (!isConfigured || !user) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-sm text-ink-base">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-600">
          <User size={14} />
        </span>
        <span className="max-w-[180px] truncate">{user.email}</span>
      </span>
      <Button variant="secondary" size="sm" icon={<LogOut size={14} />} onClick={handleSignOut}>
        Sair
      </Button>
    </div>
  );
}
