import React, { useState, useEffect, useCallback } from 'react';
import { Shield } from 'lucide-react';
import { Button } from './ui';

const CONSENT_KEY = 'cookie-consent';
const GA_ID = 'G-GG90G24S7Y';
const CLARITY_ID = 'w2tp4cvj7v';

function loadGoogleAnalytics() {
  if (document.getElementById('ga-script')) return;
  const script = document.createElement('script');
  script.id = 'ga-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', GA_ID);
  window.gtag = gtag;
}

function loadClarity() {
  if (document.getElementById('clarity-script')) return;
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.id = 'clarity-script'; t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', CLARITY_ID);
}

function loadAnalyticsScripts() {
  loadGoogleAnalytics();
  loadClarity();
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === 'accepted') {
      loadAnalyticsScripts();
    } else if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    loadAnalyticsScripts();
    setVisible(false);
  }, []);

  const handleReject = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4 animate-fade-up">
      <div className="max-w-lg mx-auto bg-surface-card border border-surface-border rounded-2xl shadow-lg p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={18} className="text-brand-500 flex-shrink-0" />
          <h3 className="text-sm font-bold text-ink-base">Privacidade</h3>
        </div>

        <p className="text-xs text-ink-muted leading-relaxed mb-3">
          Usamos cookies de análise para entender como você usa a calculadora e{' '}
          <span className="font-semibold text-ink-base">melhorar sua experiência</span>.
          {' '}<span className="font-semibold text-ink-base">Nenhum dado pessoal é coletado.</span>
        </p>

        <div className="flex items-center gap-2 bg-surface-muted rounded-lg px-3 py-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
          <span className="text-xs text-ink-muted">Cookies de análise</span>
          <span className="text-[10px] text-ink-faint ml-auto">Clarity + Google Analytics</span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={handleReject}
          >
            Rejeitar
          </Button>
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={handleAccept}
          >
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
}
