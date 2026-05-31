import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import CookieBanner from './components/CookieBanner';
import MortgageCalculator from './components/MortgageCalculator';
import CalculatorResults from './components/CalculatorResults';
import INCCResults from './components/INCCResults';
import SharedReport from './components/SharedReport';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import Assinar from './components/Assinar';
import RequireAuth from './components/auth/RequireAuth';
import { AuthProvider } from './context/AuthContext';

/**
 * App.js - Fluxo Pro (calculadora standalone)
 *
 * A calculadora fica na raiz (/) e exige login (RequireAuth). O relatório
 * compartilhado (/relatorio) é público. Login/cadastro em /login e /cadastro.
 *
 * Gating por assinatura: ainda NÃO aplicado. Quando o checkout do gateway
 * existir, envolver as rotas protegidas também com <RequireSubscription>.
 * Enquanto o Supabase não estiver configurado (sem env), o app fica aberto.
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
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<SignUp />} />
      <Route path="/relatorio" element={<SharedReport />} />

      {/* Exigem login */}
      <Route path="/assinar" element={<RequireAuth><Assinar /></RequireAuth>} />
      <Route path="/" element={<RequireAuth><CalculatorLayout><MortgageCalculator /></CalculatorLayout></RequireAuth>} />
      <Route path="/resultados" element={<RequireAuth><CalculatorLayout><CalculatorResults /></CalculatorLayout></RequireAuth>} />
      <Route path="/resultados/incc" element={<RequireAuth><CalculatorLayout><INCCResults /></CalculatorLayout></RequireAuth>} />

      {/* Qualquer outra rota volta para a calculadora */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppContent />
          <CookieBanner />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
