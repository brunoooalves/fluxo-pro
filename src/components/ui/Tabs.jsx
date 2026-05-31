import React from 'react';

/**
 * Tabs — Seletor de abas/categorias/filtros
 *
 * @param {Array<{value: string, label: string, icon?: React.Element, count?: number}>} items
 * @param {string} value - Item ativo
 * @param {function} onChange - Callback (value) => void
 * @param {'pill'|'underline'} variant
 * @param {'sm'|'md'} size
 *
 * Uso (pill — para filtros de categoria):
 *   <Tabs
 *     items={[
 *       { value: 'todas', label: 'Todas' },
 *       { value: 'luxo', label: 'Luxo', count: 3 },
 *     ]}
 *     value={activeTab}
 *     onChange={setActiveTab}
 *   />
 *
 * Uso (pill com ícones — para abas de conteúdo):
 *   <Tabs
 *     items={[
 *       { value: 'unidades', label: 'Unidades', icon: <Grid className="w-4 h-4" />, count: 42 },
 *       { value: 'visao', label: 'Visão Geral', icon: <Eye className="w-4 h-4" /> },
 *     ]}
 *     value={activeTab}
 *     onChange={setActiveTab}
 *   />
 *
 * Uso (underline — para abas de conteúdo):
 *   <Tabs variant="underline" items={tabs} value={active} onChange={setActive} />
 */

const Tabs = React.memo(function Tabs({
  items = [],
  value,
  onChange,
  variant = 'pill',
  size = 'md',
  className = '',
}) {
  if (variant === 'underline') {
    return (
      <div className={`flex gap-0 border-b border-surface-border ${className}`}>
        {items.map((item) => (
          <button
            key={item.value}
            onClick={() => onChange?.(item.value)}
            className={`
              px-4 py-2.5 text-sm font-medium flex items-center gap-2
              border-b-2 -mb-px
              transition-colors duration-150
              ${value === item.value
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-ink-muted hover:text-ink-base hover:border-surface-border'
              }
            `.trim().replace(/\s+/g, ' ')}
          >
            {item.icon && item.icon}
            {item.label}
            {item.count != null && (
              <span className="ml-1.5 text-xs text-ink-faint">{item.count}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Pill variant
  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-xs'
    : 'px-4 py-2 text-sm';

  return (
    <div className={`flex gap-1 bg-gray-100 rounded-xl p-1 ${className}`}>
      {items.map((item) => {
        const isActive = value === item.value;
        return (
          <button
            key={item.value}
            onClick={() => onChange?.(item.value)}
            className={`
              ${sizeClasses}
              rounded-lg font-medium flex items-center gap-2
              transition-all duration-150
              ${isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }
            `.trim().replace(/\s+/g, ' ')}
          >
            {item.icon && item.icon}
            {item.label}
            {item.count != null && (
              <span className={`
                text-xs font-semibold px-1.5 py-0.5 rounded-md
                ${isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-200 text-gray-500'
                }
              `.trim().replace(/\s+/g, ' ')}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});

export default Tabs;
