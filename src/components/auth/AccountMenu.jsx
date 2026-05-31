import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Trash2, ChevronDown, User, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';

/**
 * Menu de conta do usuário logado: Sair (logout) e Excluir conta (LGPD).
 * Renderiza nada quando não há login configurado/ativo.
 */
export default function AccountMenu() {
  const { user, isConfigured, signOut, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!isConfigured || !user) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const handleDelete = async () => {
    setError('');
    setDeleting(true);
    try {
      await deleteAccount();
      navigate('/cadastro', { replace: true });
    } catch (e) {
      setDeleting(false);
      setError(e?.message || 'Não foi possível excluir a conta. Tente novamente.');
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-sm text-ink-base hover:bg-surface-muted transition-colors"
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-600">
          <User size={14} />
        </span>
        <span className="max-w-[160px] truncate">{user.email}</span>
        <ChevronDown size={14} className="text-ink-faint" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-lg border border-surface-border bg-surface-card shadow-lg py-1 z-40">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-base hover:bg-surface-muted"
          >
            <LogOut size={15} /> Sair
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setConfirmOpen(true); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-status-error hover:bg-status-error-bg"
          >
            <Trash2 size={15} /> Excluir minha conta
          </button>
        </div>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => { if (!deleting) { setConfirmOpen(false); setError(''); } }}
        title="Excluir minha conta"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Excluir permanentemente
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 mt-0.5 text-status-error">
            <AlertTriangle size={20} />
          </span>
          <div className="text-sm text-ink-muted leading-relaxed">
            <p>
              Esta ação é <strong className="text-ink-base">permanente e irreversível</strong>.
              Sua conta e todos os dados associados (perfil, assinatura e histórico de
              pagamentos) serão apagados definitivamente.
            </p>
            {error && (
              <p className="mt-3 rounded-lg bg-status-error-bg p-2 text-status-error-text">{error}</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
