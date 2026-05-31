import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import AuthShell, { Field } from './AuthShell';
import { useAuth } from '../../context/AuthContext';

function traduzErro(msg = '') {
  if (/already registered|already exists/i.test(msg)) return 'Já existe uma conta com esse e-mail.';
  if (/password should be at least/i.test(msg)) return 'A senha deve ter no mínimo 6 caracteres.';
  return msg || 'Não foi possível criar a conta. Tente novamente.';
}

export default function SignUp() {
  const { signUp, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error: signUpError } = await signUp(email, password, fullName);
    setLoading(false);
    if (signUpError) {
      setError(traduzErro(signUpError.message));
      return;
    }
    // Se a confirmação de e-mail estiver ativa, não há sessão ainda.
    if (data?.session) {
      navigate('/', { replace: true });
    } else {
      setCheckEmail(true);
    }
  };

  if (checkEmail) {
    return (
      <AuthShell title="Confirme seu e-mail">
        <div className="flex flex-col items-center text-center gap-3">
          <CheckCircle2 size={40} className="text-status-success" />
          <p className="text-sm text-ink-muted">
            Enviamos um link de confirmação para <strong className="text-ink-base">{email}</strong>.
            Abra o e-mail para ativar sua conta e depois faça login.
          </p>
          <Link to="/login" className="text-brand-600 font-semibold hover:underline">Ir para o login</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Criar conta"
      subtitle="Comece a usar o Fluxo Pro"
      footer={<>Já tem conta? <Link to="/login" className="text-brand-600 font-semibold hover:underline">Entrar</Link></>}
    >
      {!isConfigured && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-status-warning-bg p-3 text-xs text-status-warning-text">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>Cadastro ainda não configurado. Defina as chaves do Supabase no <code>.env.local</code>.</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Field label="Nome completo" value={fullName} autoComplete="name"
          onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
        <Field label="E-mail" type="email" value={email} autoComplete="email"
          onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
        <Field label="Senha" type="password" value={password} autoComplete="new-password"
          onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 6 caracteres" />

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-status-error-bg p-3 text-sm text-status-error-text">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" variant="primary" fullWidth loading={loading} disabled={!isConfigured}>
          Criar conta
        </Button>
      </form>
    </AuthShell>
  );
}
