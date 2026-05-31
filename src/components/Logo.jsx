import React from 'react';
import { Link } from 'react-router-dom';
import { Calculator } from 'lucide-react';

/**
 * Logo da marca — usado de forma consistente em todas as páginas.
 *
 * Props:
 *   - size: 'sm' | 'md' | 'lg'
 *   - to: se fornecido, vira um link (react-router) para essa rota
 *   - className
 */
const SIZES = {
  sm: { box: 'w-8 h-8 rounded-lg', icon: 16, text: 'text-base' },
  md: { box: 'w-9 h-9 rounded-xl', icon: 18, text: 'text-lg' },
  lg: { box: 'w-10 h-10 rounded-xl', icon: 20, text: 'text-xl' },
};

export default function Logo({ size = 'md', to, className = '' }) {
  const s = SIZES[size] || SIZES.md;

  const content = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`${s.box} bg-brand-500 text-white flex items-center justify-center flex-shrink-0`}>
        <Calculator size={s.icon} />
      </span>
      <span className={`${s.text} font-bold text-ink-base tracking-tight`}>Fluxo Pro</span>
    </span>
  );

  if (to) {
    return <Link to={to} className="inline-flex">{content}</Link>;
  }
  return content;
}
