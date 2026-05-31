import React from 'react';

/**
 * EmptyState — Estado vazio quando não há dados
 * 
 * @param {string} icon - Emoji ou ícone como string
 * @param {string} title - Título
 * @param {string} description - Descrição
 * @param {React.ReactNode} action - Botão CTA
 * 
 * Uso:
 *   <EmptyState
 *     icon="✦"
 *     title="Nenhum conteúdo gerado"
 *     description="Selecione um template e gere seu primeiro conteúdo com IA"
 *     action={<Button>Gerar Conteúdo</Button>}
 *   />
 */

const EmptyState = React.memo(function EmptyState({
  icon = '📭',
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-8 text-center ${className}`}>
      <span className="text-4xl mb-4 block">{icon}</span>
      {title && (
        <h3 className="text-lg font-semibold text-ink-base mb-2">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-ink-faint max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  );
});

export default EmptyState;
