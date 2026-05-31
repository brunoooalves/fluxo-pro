import React from 'react';

/**
 * Badge — Labels de status, categorias e contadores
 * 
 * @param {'success'|'warning'|'error'|'info'|'neutral'|'brand'} variant
 * @param {'sm'|'md'} size
 * @param {boolean} dot - Mostra bolinha colorida antes do texto
 * 
 * Uso:
 *   <Badge variant="success" dot>Publicado</Badge>
 *   <Badge variant="warning">Rascunho</Badge>
 *   <Badge variant="brand">Investidor</Badge>
 *   <Badge variant="neutral" size="sm">41 placeholders</Badge>
 */

const variantStyles = {
  success: 'bg-status-success-bg text-status-success-text',
  warning: 'bg-status-warning-bg text-status-warning-text',
  error:   'bg-status-error-bg text-status-error-text',
  info:    'bg-status-info-bg text-status-info-text',
  neutral: 'bg-surface-muted text-ink-muted',
  brand:   'bg-brand-50 text-brand-600',
};

const dotColors = {
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  error:   'bg-status-error',
  info:    'bg-status-info',
  neutral: 'bg-ink-faint',
  brand:   'bg-brand-500',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

const Badge = React.memo(function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        font-semibold rounded-md
        whitespace-nowrap
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
});

export default Badge;
