import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import AuthShell, { Field } from './AuthShell';
import { useAuth } from '../../context/AuthContext';

function traduzErro(msg = '') {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar.';
  return msg || 'Não foi possível entrar. Tente novamente.';
}

export default function Login() {
  const { signIn, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    if (signInError) {
      setError(traduzErro(signInError.message));
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse sua conta do Fluxo Pro"
      footer={<>Não tem conta? <Link to="/cadastro" className="text-brand-600 font-semibold hover:underline">Criar conta</Link></>}
    >
      {!isConfigured && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-status-warning-bg p-3 text-xs text-status-warning-text">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>Login ainda não configurado. Defina as chaves do Supabase no <code>.env.local</code>.</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Field label="E-mail" type="email" value={email} autoComplete="email"
          onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
        <Field label="Senha" type="password" value={password} autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-status-error-bg p-3 text-sm text-status-error-text">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" variant="primary" fullWidth loading={loading} disabled={!isConfigured}>
          Entrar
        </Button>
      </form>
    </AuthShell>
  );
}
