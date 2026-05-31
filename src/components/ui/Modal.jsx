import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

/**
 * Modal — Overlay modal padronizado
 * 
 * @param {boolean} open - Controla visibilidade
 * @param {function} onClose - Callback ao fechar
 * @param {string} title - Título do modal
 * @param {string} description - Descrição opcional
 * @param {'sm'|'md'|'lg'|'xl'} size - Largura
 * @param {React.ReactNode} footer - Conteúdo do rodapé (botões)
 * 
 * Uso:
 *   <Modal 
 *     open={showModal} 
 *     onClose={() => setShowModal(false)}
 *     title="Gerar Conteúdo com IA"
 *     description="Template: Luxo · 41 placeholders"
 *     footer={<Button onClick={generate}>Gerar</Button>}
 *   >
 *     {conteúdo}
 *   </Modal>
 */

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const Modal = React.memo(function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  children,
  className = '',
}) {
  // Fecha com ESC
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Content */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
          relative w-full ${sizeClasses[size]}
          bg-surface-card rounded-2xl
          shadow-modal
          animate-fade-up
          max-h-[85vh] flex flex-col
          ${className}
        `.trim().replace(/\s+/g, ' ')}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="flex items-start justify-between p-6 pb-0">
            <div>
              {title && (
                <h2 className="text-2xl font-bold text-ink-base tracking-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-ink-faint mt-1">{description}</p>
              )}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="
                  flex items-center justify-center
                  w-8 h-8 rounded-lg
                  bg-surface-muted text-ink-muted
                  hover:bg-surface-border hover:text-ink-base
                  transition-colors duration-150
                  flex-shrink-0 ml-4
                "
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
});

export default Modal;
