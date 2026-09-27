import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import {
  formatTaxId, formatCep, onlyDigits, isValidCPF, isValidCNPJ,
  saveBillingProfile, lookupCep,
} from '../utils/billingProfile';

const inputClass =
  'w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm ' +
  'text-ink-base placeholder:text-ink-faint focus:outline-none focus:ring-2 ' +
  'focus:ring-brand-300 focus:border-brand-400 disabled:opacity-60';

function Input({ label, hint, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-ink-base mb-1.5">{label}</span>
      <input className={inputClass} {...props} />
      {hint && <span className="block text-xs text-ink-faint mt-1">{hint}</span>}
    </label>
  );
}

const EMPTY = {
  name: '', tax_id: '', email: '', cep: '', logradouro: '', numero: '',
  complemento: '', bairro: '', cidade: '', uf: '', ibge_code: '',
};

/**
 * Formulário de dados fiscais (tomador da NFS-e).
 *
 * Props:
 *   - user: usuário logado (id/email para pré-preencher)
 *   - initial: perfil existente (ou null)
 *   - onSaved(profile): chamado após salvar
 *   - onCancel(): opcional
 */
export default function BillingProfileForm({ user, initial = null, onSaved, onCancel, submitLabel = 'Salvar e continuar' }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    ...(initial || {}),
    email: initial?.email || user?.email || '',
    name: initial?.name || user?.user_metadata?.full_name || '',
    tax_id: initial?.tax_id ? formatTaxId(initial.tax_id) : '',
    cep: initial?.cep ? formatCep(initial.cep) : '',
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const isCnpj = onlyDigits(form.tax_id).length > 11;

  // Busca o endereço ao completar o CEP.
  useEffect(() => {
    const digits = onlyDigits(form.cep);
    if (digits.length !== 8) return undefined;
    let cancelled = false;
    setCepLoading(true);
    lookupCep(digits).then((addr) => {
      if (cancelled) return;
      setCepLoading(false);
      if (addr) setForm((f) => ({ ...f, ...addr }));
    });
    return () => { cancelled = true; };
  }, [form.cep]);

  const validate = () => {
    const digits = onlyDigits(form.tax_id);
    if (!form.name.trim()) return 'Informe o nome completo ou a razão social.';
    if (digits.length === 11 && !isValidCPF(digits)) return 'CPF inválido.';
    if (digits.length === 14 && !isValidCNPJ(digits)) return 'CNPJ inválido.';
    if (digits.length !== 11 && digits.length !== 14) return 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).';
    if (isCnpj && (onlyDigits(form.cep).length !== 8 || !form.numero.trim())) {
      return 'Para CNPJ, informe o CEP e o número do endereço.';
    }
    if (onlyDigits(form.cep).length > 0 && onlyDigits(form.cep).length !== 8) return 'CEP incompleto.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError('');
    setSaving(true);
    try {
      const saved = await saveBillingProfile(user.id, form);
      onSaved?.(saved);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="text-sm text-ink-muted mb-4">
        Usamos estes dados para emitir a nota fiscal (NFS-e) de cada cobrança da assinatura.
      </p>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-status-error-bg p-3 text-sm text-status-error-text">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="CPF ou CNPJ"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          value={form.tax_id}
          onChange={(e) => setForm((f) => ({ ...f, tax_id: formatTaxId(e.target.value) }))}
          required
        />
        <Input
          label={isCnpj ? 'Razão social' : 'Nome completo'}
          autoComplete="name"
          value={form.name}
          onChange={set('name')}
          required
        />
        <Input
          label="E-mail para a nota"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set('email')}
          className="sm:col-span-2"
        />
        <Input
          label={isCnpj ? 'CEP' : 'CEP (opcional)'}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          value={form.cep}
          onChange={(e) => setForm((f) => ({ ...f, cep: formatCep(e.target.value) }))}
          hint={cepLoading ? 'Buscando endereço…' : undefined}
        />
        <Input
          label={isCnpj ? 'Número' : 'Número (opcional)'}
          autoComplete="address-line2"
          value={form.numero}
          onChange={set('numero')}
        />
        <Input
          label="Logradouro"
          autoComplete="address-line1"
          value={form.logradouro}
          onChange={set('logradouro')}
          className="sm:col-span-2"
        />
        <Input label="Complemento" value={form.complemento} onChange={set('complemento')} />
        <Input label="Bairro" value={form.bairro} onChange={set('bairro')} />
        <Input label="Cidade" autoComplete="address-level2" value={form.cidade} onChange={set('cidade')} />
        <Input
          label="UF"
          autoComplete="address-level1"
          maxLength={2}
          value={form.uf}
          onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))}
        />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={saving}
          icon={saving ? <Loader2 size={16} className="animate-spin" /> : undefined}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
