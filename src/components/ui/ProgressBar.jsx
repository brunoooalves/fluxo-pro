import React from 'react';

/**
 * ProgressBar — Barra de progresso/cobertura
 * 
 * @param {number} value - Porcentagem (0-100)
 * @param {string} label - Label opcional (ex: "40/41")
 * @param {'sm'|'md'} size
 * @param {'auto'|'success'|'warning'|'error'|'brand'} color
 *   auto: verde >90%, amarelo >60%, vermelho <=60%
 * 
 * Uso:
 *   <ProgressBar value={98} label="40/41" />
 *   <ProgressBar value={45} color="brand" size="sm" />
 */

const colorClasses = {
  success: 'bg-gradient-to-r from-status-success to-emerald-400',
  warning: 'bg-gradient-to-r from-status-warning to-amber-400',
  error:   'bg-gradient-to-r from-status-error to-red-400',
  brand:   'bg-gradient-to-r from-brand-500 to-brand-400',
};

function getAutoColor(value) {
  if (value >= 90) return colorClasses.success;
  if (value >= 60) return colorClasses.warning;
  return colorClasses.error;
}

const sizes = {
  sm: 'h-1',
  md: 'h-1.5',
};

const ProgressBar = React.memo(function ProgressBar({
  value = 0,
  label,
  size = 'md',
  color = 'auto',
  className = '',
}) {
  const barColor = color === 'auto' ? getAutoColor(value) : colorClasses[color];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`flex-1 max-w-[120px] rounded-full bg-surface-border overflow-hidden ${sizes[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {label && (
        <span className="text-xs font-medium text-ink-muted whitespace-nowrap">
          {label}
        </span>
      )}
    </div>
  );
});

export default ProgressBar;
