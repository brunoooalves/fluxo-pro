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
import Landing from './components/landing/Landing';
import RequireAuth from './components/auth/RequireAuth';
import AccountMenu from './components/auth/AccountMenu';
import { AuthProvider, useAuth } from './context/AuthContext';

/**
 * App.js - Fluxo Pro
 *
 * A raiz (/) é a landing pública (apresentação + planos + login via modal).
 * A calculadora fica em /calculadora e exige login (RequireAuth).
 * /relatorio e /assinar são públicas.
 *
 * Gating por assinatura: ainda NÃO aplicado. Quando o checkout do gateway
 * existir, envolver as rotas da calculadora também com <RequireSubscription>.
 * Enquanto o Supabase não estiver configurado (sem env), o app fica aberto.
 */

function CalculatorLayout({ children }) {
  const { user, isConfigured } = useAuth();
  return (
    <div className="min-h-screen bg-surface-base font-sans text-ink-base">
      {isConfigured && user && (
        <div className="flex justify-end px-4 pt-3">
          <AccountMenu />
        </div>
      )}
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
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<SignUp />} />
      <Route path="/relatorio" element={<SharedReport />} />
      <Route path="/assinar" element={<Assinar />} />

      {/* Calculadora (exige login) */}
      <Route path="/calculadora" element={<RequireAuth><CalculatorLayout><MortgageCalculator /></CalculatorLayout></RequireAuth>} />
      <Route path="/calculadora/resultados" element={<RequireAuth><CalculatorLayout><CalculatorResults /></CalculatorLayout></RequireAuth>} />
      <Route path="/calculadora/resultados/incc" element={<RequireAuth><CalculatorLayout><INCCResults /></CalculatorLayout></RequireAuth>} />

      {/* Qualquer outra rota volta para a landing */}
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
