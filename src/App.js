import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import CookieBanner from './components/CookieBanner';
import MortgageCalculator from './components/MortgageCalculator';
import CalculatorResults from './components/CalculatorResults';
import INCCResults from './components/INCCResults';
import SharedReport from './components/SharedReport';

/**
 * App.js - Fluxo Pro (calculadora standalone)
 *
 * Aplicação dedicada apenas à calculadora de financiamento imobiliário.
 * Sem autenticação, AppLayout ou NavBar — deploy independente no Netlify.
 * A calculadora fica na raiz (/). Demais telas: /resultados,
 * /resultados/incc e /relatorio (relatório público compartilhado).
 */

function CalculatorLayout({ children }) {
  return (
    <div className="min-h-screen bg-surface-base font-sans text-ink-base">
      <main className="pb-8">
        {children}
      </main>
    </div>
  );
}

function AppContent() {
  return (
    <CalculatorLayout>
      <Routes>
        {/* Calculadora na raiz */}
        <Route path="/" element={<MortgageCalculator />} />
        <Route path="/resultados" element={<CalculatorResults />} />
        <Route path="/resultados/incc" element={<INCCResults />} />
        <Route path="/relatorio" element={<SharedReport />} />

        {/* Qualquer outra rota volta para a calculadora */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CalculatorLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
        <CookieBanner />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
