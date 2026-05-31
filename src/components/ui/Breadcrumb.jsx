import React from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * Breadcrumb — Navegação hierárquica
 * 
 * @param {Array<{label: string, href?: string, onClick?: function}>} items
 * 
 * Uso:
 *   <Breadcrumb items={[
 *     { label: 'Lançamentos', href: '/lancamentos' },
 *     { label: 'Edifício Humberto Baltar', href: '/lancamentos/28' },
 *     { label: 'Studio' },  // último = ativo, sem link
 *   ]} />
 */

const Breadcrumb = React.memo(function Breadcrumb({ items = [], className = '' }) {
  return (
    <nav
      className={`flex items-center gap-1.5 text-sm ${className}`}
      aria-label="Breadcrumb"
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;

        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <ChevronRight size={14} className="text-ink-faint flex-shrink-0" />
            )}
            {isLast ? (
              <span className="text-ink-base font-medium">
                {item.label}
              </span>
            ) : (
              <a
                href={item.href || '#'}
                onClick={(e) => {
                  if (item.onClick) {
                    e.preventDefault();
                    item.onClick();
                  }
                }}
                className="text-brand-500 hover:text-brand-600 transition-colors duration-150"
              >
                {item.label}
              </a>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
});

export default Breadcrumb;
