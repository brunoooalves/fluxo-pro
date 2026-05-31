import React from 'react';

/**
 * Card — Container visual padronizado
 * 
 * @param {'default'|'interactive'|'outlined'} variant
 * @param {'none'|'sm'|'md'|'lg'} padding
 * @param {boolean} hover - Efeito de elevação no hover
 * @param {string} className - Classes adicionais
 * 
 * Uso:
 *   <Card>Conteúdo simples</Card>
 *   <Card variant="interactive" hover onClick={...}>Card clicável</Card>
 *   <Card padding="lg" className="col-span-2">Card grande</Card>
 * 
 * Subcomponentes:
 *   <Card.Header>
 *     <Card.Title>Título</Card.Title>
 *     <Card.Description>Subtítulo</Card.Description>
 *   </Card.Header>
 *   <Card.Body>Conteúdo</Card.Body>
 *   <Card.Footer>Ações</Card.Footer>
 */

const paddings = {
  none: '',
  sm:   'p-3 sm:p-4',
  md:   'p-4 sm:p-6',
  lg:   'p-4 sm:p-8',
};

const variantStyles = {
  default:     'bg-surface-card',
  interactive: 'bg-surface-card cursor-pointer',
  outlined:    'bg-surface-card border border-surface-border',
};

const Card = React.memo(function Card({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  className = '',
  ...props
}) {
  return (
    <div
      className={`
        rounded-2xl
        ${variantStyles[variant]}
        ${paddings[padding]}
        ${hover ? 'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </div>
  );
});

// Subcomponentes
const Header = React.memo(function Header({ children, className = '', ...props }) {
  return (
    <div className={`flex items-center justify-between mb-5 ${className}`} {...props}>
      {children}
    </div>
  );
});

const Title = React.memo(function Title({ children, className = '', as: Tag = 'h2' }) {
  return (
    <Tag className={`text-xl font-semibold text-ink-base tracking-tight ${className}`}>
      {children}
    </Tag>
  );
});

const Description = React.memo(function Description({ children, className = '' }) {
  return (
    <p className={`text-sm text-ink-faint mt-1 ${className}`}>
      {children}
    </p>
  );
});

const Body = React.memo(function Body({ children, className = '', ...props }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
});

const Footer = React.memo(function Footer({ children, className = '' }) {
  return (
    <div className={`flex items-center justify-end gap-3 mt-5 pt-5 border-t border-surface-border ${className}`}>
      {children}
    </div>
  );
});

Card.Header = Header;
Card.Title = Title;
Card.Description = Description;
Card.Body = Body;
Card.Footer = Footer;

export default Card;
