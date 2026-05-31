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
 * As rotas mantêm o prefixo /calculadora por compatibilidade com os
 * navigate() hardcoded nos componentes. A raiz (/) redireciona para /calculadora.
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
        {/* Raiz redireciona para /calculadora */}
        <Route path="/" element={<Navigate to="/calculadora" replace />} />

        {/* Rotas da calculadora (mesmo path do app principal) */}
        <Route path="/calculadora" element={<MortgageCalculator />} />
        <Route path="/calculadora/resultados" element={<CalculatorResults />} />
        <Route path="/calculadora/resultados/incc" element={<INCCResults />} />
        <Route path="/calculadora/relatorio" element={<SharedReport />} />

        {/* Qualquer outra rota redireciona para a calculadora */}
        <Route path="*" element={<Navigate to="/calculadora" replace />} />
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
