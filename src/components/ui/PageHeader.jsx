import React from 'react';

/**
 * PageHeader — Header de página padronizado
 * 
 * Substitui os headers roxos/coloridos atuais por algo
 * consistente e reutilizável em todas as páginas.
 * 
 * @param {string} title - Título principal
 * @param {string} subtitle - Subtítulo ou localização
 * @param {React.ReactNode} badges - Badges de status
 * @param {React.ReactNode} meta - Informações adicionais (metragem, preço, etc.)
 * @param {React.ReactNode} actions - Botões de ação no canto direito
 * @param {'default'|'hero'} variant - default = compacto, hero = com fundo escuro
 * 
 * Uso (default):
 *   <PageHeader
 *     title="Propriedades"
 *     subtitle="Gerencie seus imóveis"
 *     actions={<Button>Adicionar</Button>}
 *   />
 * 
 * Uso (hero — para páginas de detalhe):
 *   <PageHeader
 *     variant="hero"
 *     title="Edifício Humberto Baltar"
 *     subtitle="Ponta Verde, Maceió - AL"
 *     badges={<><Badge variant="success" dot>Em lançamento</Badge></>}
 *     meta={<span>Apartamentos · 2 e 3 quartos · 58m² a 112m²</span>}
 *   />
 */

const PageHeader = React.memo(function PageHeader({
  title,
  subtitle,
  badges,
  meta,
  actions,
  variant = 'default',
  className = '',
}) {
  if (variant === 'hero') {
    return (
      <div
        className={`relative rounded-2xl overflow-hidden mx-8 mb-6 border ${className}`}
        style={{
          background: 'linear-gradient(135deg, #F6F5EE, #EBE8D8)',
          borderColor: '#D4CEB4',
        }}
      >
        <div className="relative z-10 px-10 py-8 flex items-start justify-between">
          <div>
            {badges && (
              <div className="flex items-center gap-2 mb-3">
                {badges}
              </div>
            )}
            <h1 className="text-2xl font-bold font-sans tracking-tight" style={{ color: '#3D3B20' }}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm mt-2 flex items-center gap-2" style={{ color: '#5C5830' }}>
                <span style={{ color: '#6B6530' }}>◉</span>
                {subtitle}
              </p>
            )}
            {meta && (
              <div className="flex items-center gap-4 mt-3 text-sm" style={{ color: '#78733F' }}>
                {meta}
              </div>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant — compacto
  return (
    <div className={`px-8 py-5 flex items-center justify-between ${className}`}>
      <div>
        <h1 className="text-2xl font-semibold text-ink-base tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-ink-faint mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
});

export default PageHeader;
