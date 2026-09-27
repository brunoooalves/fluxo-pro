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
import AssinarRetorno from './components/AssinarRetorno';
import MinhasNotas from './components/MinhasNotas';
import Landing from './components/landing/Landing';
import RequireAuth from './components/auth/RequireAuth';
import RequireSubscription from './components/auth/RequireSubscription';
import AccountMenu from './components/auth/AccountMenu';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isSupabaseConfigured } from './lib/supabaseClient';

/**
 * App.js - Fluxo Pro
 *
 * A raiz (/) é a landing pública (apresentação + planos + login via modal).
 * A calculadora fica em /calculadora e exige login (RequireAuth).
 * /relatorio e /assinar são públicas.
 *
 * Gating por assinatura: as rotas da calculadora exigem login (RequireAuth) e
 * assinatura ativa via Mercado Pago (RequireSubscription → /assinar).
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
      {/* Públicas — em modo aberto (sem Supabase) a raiz vai direto à calculadora */}
      <Route path="/" element={isSupabaseConfigured ? <Landing /> : <Navigate to="/calculadora" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<SignUp />} />
      <Route path="/relatorio" element={<SharedReport />} />
      <Route path="/assinar" element={<Assinar />} />
      <Route path="/assinar/retorno" element={<AssinarRetorno />} />

      {/* Calculadora (exige login + assinatura ativa) */}
      <Route path="/calculadora" element={<RequireAuth><RequireSubscription><CalculatorLayout><MortgageCalculator /></CalculatorLayout></RequireSubscription></RequireAuth>} />
      <Route path="/calculadora/resultados" element={<RequireAuth><RequireSubscription><CalculatorLayout><CalculatorResults /></CalculatorLayout></RequireSubscription></RequireAuth>} />
      <Route path="/calculadora/resultados/incc" element={<RequireAuth><RequireSubscription><CalculatorLayout><INCCResults /></CalculatorLayout></RequireSubscription></RequireAuth>} />
      <Route path="/calculadora/notas" element={<RequireAuth><RequireSubscription><CalculatorLayout><MinhasNotas /></CalculatorLayout></RequireSubscription></RequireAuth>} />

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
