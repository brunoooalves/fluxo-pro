import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field } from './AuthShell';
import { useAuth } from '../../context/AuthContext';

function traduzErro(msg = '') {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar.';
  if (/already registered|already exists/i.test(msg)) return 'Já existe uma conta com esse e-mail.';
  if (/password should be at least/i.test(msg)) return 'A senha deve ter no mínimo 6 caracteres.';
  return msg || 'Algo deu errado. Tente novamente.';
}

/**
 * Modal de autenticação (login + cadastro) para a landing.
 *
 * Props:
 *   - open, onClose
 *   - initialMode: 'login' | 'signup'
 *   - redirectTo: rota após sucesso (default '/calculadora')
 */
export default function LoginModal({ open, onClose, initialMode = 'login', redirectTo = '/calculadora' }) {
  const { signIn, signUp, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError('');
      setCheckEmail(false);
    }
  }, [open, initialMode]);

  const isSignup = mode === 'signup';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (isSignup) {
      const { data, error: err } = await signUp(email, password, fullName);
      setLoading(false);
      if (err) return setError(traduzErro(err.message));
      if (data?.session) { onClose?.(); navigate(redirectTo, { replace: true }); }
      else setCheckEmail(true);
    } else {
      const { error: err } = await signIn(email, password);
      setLoading(false);
      if (err) return setError(traduzErro(err.message));
      onClose?.();
      navigate(redirectTo, { replace: true });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={checkEmail ? 'Confirme seu e-mail' : isSignup ? 'Criar conta' : 'Entrar'}
      size="sm"
    >
      {checkEmail ? (
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <CheckCircle2 size={40} className="text-status-success" />
          <p className="text-sm text-ink-muted">
            Enviamos um link de confirmação para <strong className="text-ink-base">{email}</strong>.
            Abra o e-mail para ativar sua conta e depois faça login.
          </p>
          <Button variant="secondary" onClick={() => { setCheckEmail(false); setMode('login'); }}>
            Voltar para o login
          </Button>
        </div>
      ) : (
        <>
          {!isConfigured && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-status-warning-bg p-3 text-xs text-status-warning-text">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>Login ainda não configurado (defina as chaves do Supabase).</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isSignup && (
              <Field label="Nome completo" value={fullName} autoComplete="name"
                onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
            )}
            <Field label="E-mail" type="email" value={email} autoComplete="email"
              onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            <Field label="Senha" type="password" value={password}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? 'mínimo 6 caracteres' : '••••••••'} />

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-status-error-bg p-3 text-sm text-status-error-text">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" variant="primary" fullWidth loading={loading} disabled={!isConfigured}>
              {isSignup ? 'Criar conta' : 'Entrar'}
            </Button>
          </form>

          <p className="text-center text-sm text-ink-muted mt-4">
            {isSignup ? (
              <>Já tem conta?{' '}
                <button type="button" onClick={() => { setMode('login'); setError(''); }}
                  className="text-brand-600 font-semibold hover:underline">Entrar</button>
              </>
            ) : (
              <>Não tem conta?{' '}
                <button type="button" onClick={() => { setMode('signup'); setError(''); }}
                  className="text-brand-600 font-semibold hover:underline">Criar conta</button>
              </>
            )}
          </p>
        </>
      )}
    </Modal>
  );
}
