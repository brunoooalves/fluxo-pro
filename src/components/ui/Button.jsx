import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Button — Componente de botão padronizado
 * 
 * @param {'primary'|'secondary'|'ghost'|'danger'} variant - Estilo visual
 * @param {'sm'|'md'|'lg'} size - Tamanho
 * @param {boolean} loading - Mostra spinner e desabilita
 * @param {boolean} fullWidth - Ocupa largura total
 * @param {React.ReactNode} icon - Ícone à esquerda (componente Lucide)
 * @param {string} className - Classes adicionais
 * 
 * Uso:
 *   <Button variant="primary" icon={<Sparkles size={16} />}>
 *     Gerar Conteúdo com IA
 *   </Button>
 *   <Button variant="secondary" size="sm">Cancelar</Button>
 *   <Button variant="ghost" loading>Salvando...</Button>
 */

const variants = {
  primary: `
    bg-brand-500 text-white 
    hover:bg-brand-600 
    active:bg-brand-700
    shadow-sm hover:shadow-brand
    focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2
  `,
  secondary: `
    bg-surface-card text-ink-base 
    border border-surface-border 
    hover:bg-surface-muted 
    active:bg-surface-border
    focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2
  `,
  ghost: `
    bg-transparent text-ink-muted 
    hover:bg-surface-muted hover:text-ink-base
    active:bg-surface-border
    focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2
  `,
  danger: `
    bg-status-error text-white 
    hover:bg-red-600 
    active:bg-red-700
    shadow-sm
    focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2
  `,
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-md',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-6 py-3 text-base gap-2 rounded-lg',
};

const Button = React.memo(function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon = null,
  className = '',
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center
        font-semibold
        transition-all duration-150 ease-out
        cursor-pointer
        select-none
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
});

export default Button;
