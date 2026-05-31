import React, { useState, useRef, useEffect } from 'react';
import { Share2, QrCode, Link2, FileDown, Check, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from './ui';
import { generateSignedShareUrl } from '../utils/shareUtils';

export default function ShareMenu({
  customOpcoes,
  calculatorInputs,
  resultados,
  reportInfo,
  selectedForPdf,
  selectedCount,
  totalCount,
  onExportPdf,
  neighborhoods,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareError, setShareError] = useState(null);
  const [qrUrl, setQrUrl] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (shareError) {
      const timer = setTimeout(() => setShareError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [shareError]);

  const buildShareData = () => ({
    customOpcoes,
    calculatorInputs,
    resultados,
    reportInfo,
    selectedForPdf,
    neighborhoods,
  });

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const handleQrCode = async () => {
    setIsOpen(false);
    setIsGenerating(true);
    setShareError(null);

    try {
      const url = await generateSignedShareUrl(buildShareData());
      setQrUrl(url);
      setShowQrModal(true);
    } catch {
      setShareError('Erro ao gerar QR Code. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    setIsGenerating(true);
    setShareError(null);

    try {
      const url = await generateSignedShareUrl(buildShareData());
      await copyToClipboard(url);
      setLinkCopied(true);
      setTimeout(() => {
        setLinkCopied(false);
        setIsOpen(false);
      }, 1500);
    } catch {
      setShareError('Erro ao gerar link. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyQrLink = async () => {
    if (qrUrl) {
      await copyToClipboard(qrUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    }
  };

  const handlePdf = () => {
    setIsOpen(false);
    onExportPdf();
  };

  const isDisabled = selectedCount === 0;

  return (
    <>
      <div className="relative flex-1" ref={menuRef}>
        <button
          onClick={() => !isDisabled && !isGenerating && setIsOpen(!isOpen)}
          disabled={isDisabled || isGenerating}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl shadow-lg font-semibold text-sm transition-all duration-200 ${
            isDisabled || isGenerating
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-brand-500 text-white hover:bg-brand-600 active:scale-95'
          }`}
        >
          {isGenerating ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Share2 size={18} />
          )}
          {isGenerating ? 'Gerando...' : `Compartilhar (${selectedCount}/${totalCount})`}
          {!isDisabled && !isGenerating && <ChevronUp size={14} className={`transition-transform ${isOpen ? '' : 'rotate-180'}`} />}
        </button>

        {/* Error toast */}
        {shareError && (
          <div className="absolute bottom-full left-0 right-0 mb-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2 animate-fade-up z-50">
            <AlertCircle size={16} className="flex-shrink-0" />
            {shareError}
          </div>
        )}

        {isOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-surface-border overflow-hidden animate-fade-up z-50">
            <button
              onClick={handleQrCode}
              disabled={isGenerating}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-ink-base hover:bg-surface-hover transition-colors text-left disabled:opacity-50"
            >
              <QrCode size={18} className="text-brand-500 flex-shrink-0" />
              <div>
                <p className="font-medium">QR Code</p>
                <p className="text-xs text-ink-muted">Mostrar na tela para o cliente escanear</p>
              </div>
            </button>
            <div className="border-t border-surface-border" />
            <button
              onClick={handleCopyLink}
              disabled={isGenerating}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-ink-base hover:bg-surface-hover transition-colors text-left disabled:opacity-50"
            >
              {linkCopied ? (
                <Check size={18} className="text-emerald-500 flex-shrink-0" />
              ) : (
                <Link2 size={18} className="text-brand-500 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium">{linkCopied ? 'Link copiado!' : 'Copiar Link'}</p>
                <p className="text-xs text-ink-muted">Enviar via WhatsApp ou qualquer app</p>
              </div>
            </button>
            <div className="border-t border-surface-border" />
            <button
              onClick={handlePdf}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-ink-base hover:bg-surface-hover transition-colors text-left"
            >
              <FileDown size={18} className="text-brand-500 flex-shrink-0" />
              <div>
                <p className="font-medium">Exportar PDF</p>
                <p className="text-xs text-ink-muted">Baixar relatório em PDF</p>
              </div>
            </button>
          </div>
        )}
      </div>

      <Modal
        open={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="QR Code da Simulação"
        description="Peça para o cliente escanear com a câmera do celular"
        size="sm"
      >
        <div className="flex flex-col items-center gap-6 py-4">
          {qrUrl && (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-surface-border">
              <QRCodeSVG
                value={qrUrl}
                size={220}
                level="M"
                includeMargin
              />
            </div>
          )}
          {reportInfo?.imovel?.nome && (
            <p className="text-sm font-medium text-ink-base text-center">{reportInfo.imovel.nome}</p>
          )}
          {reportInfo?.corretor?.nome && (
            <p className="text-xs text-ink-muted text-center">
              Preparado por {reportInfo.corretor.nome}
              {reportInfo.corretor.creci ? ` — CRECI ${reportInfo.corretor.creci}` : ''}
            </p>
          )}
          <button
            onClick={handleCopyQrLink}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
          >
            {linkCopied ? <Check size={16} /> : <Link2 size={16} />}
            {linkCopied ? 'Copiado!' : 'Copiar link também'}
          </button>
        </div>
      </Modal>
    </>
  );
}
