import React from 'react';
import { Calculator } from 'lucide-react';
import Card from '../ui/Card';

/**
 * Layout compartilhado das telas de autenticação (login/cadastro).
 */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center">
            <Calculator size={20} />
          </div>
          <span className="text-xl font-bold text-ink-base">Fluxo Pro</span>
        </div>

        <Card padding="lg">
          <h1 className="text-2xl font-semibold text-ink-base">{title}</h1>
          {subtitle && <p className="text-sm text-ink-muted mt-1 mb-6">{subtitle}</p>}
          {!subtitle && <div className="mb-6" />}
          {children}
        </Card>

        {footer && (
          <p className="text-center text-sm text-ink-muted mt-4">{footer}</p>
        )}
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm ' +
  'text-ink-base placeholder:text-ink-faint focus:outline-none focus:ring-2 ' +
  'focus:ring-brand-300 focus:border-brand-400';

export function Field({ label, type = 'text', value, onChange, autoComplete, placeholder, required = true }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium text-ink-base mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}
