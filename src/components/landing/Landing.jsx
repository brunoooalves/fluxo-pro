import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calculator, TrendingUp, FileText, Share2, LineChart, ArrowRight, Check, LogOut,
} from 'lucide-react';
import Button from '../ui/Button';
import PlansSection from '../PlansSection';
import LoginModal from '../auth/LoginModal';
import { useAuth } from '../../context/AuthContext';

/**
 * Landing pública (rota /). Apresentação do produto + planos + login via modal.
 *
 * As imagens do produto são placeholders — troque pelos screenshots reais
 * (coloque em /public e referencie, ou importe de src/assets).
 */

const FEATURES = [
  { icon: Calculator, title: 'Vários cenários de pagamento', desc: 'Monte combinações de entrada, parcelas mensais e intercaladas — escalonável ou por porcentagens.' },
  { icon: TrendingUp, title: 'Correção pelo INCC', desc: 'Projete o impacto do INCC mês a mês até a entrega das chaves.' },
  { icon: LineChart, title: 'Valorização (FipeZap)', desc: 'Estime a valorização do imóvel e o ganho real por cidade e bairro.' },
  { icon: FileText, title: 'Relatório em PDF', desc: 'Gere um relatório profissional para enviar ao seu cliente.' },
  { icon: Share2, title: 'Link compartilhável', desc: 'Compartilhe a simulação por um link com a sua marca.' },
];

function ProductImage({ label, className = '' }) {
  return (
    <div className={`relative rounded-2xl border border-surface-border bg-gradient-to-br from-brand-50 to-surface-muted overflow-hidden ${className}`}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-brand-300">
        <Calculator size={40} />
        <span className="text-xs text-ink-faint">{label}</span>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const openAuth = (mode) => { setAuthMode(mode); setAuthOpen(true); };
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-surface-base font-sans text-ink-base">
      {/* NAV */}
      <header className="sticky top-0 z-30 bg-surface-base/80 backdrop-blur border-b border-surface-border">
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center">
              <Calculator size={18} />
            </div>
            <span className="text-lg font-bold">Fluxo Pro</span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm text-ink-muted">
            <button onClick={() => scrollTo('recursos')} className="hover:text-ink-base">Recursos</button>
            <button onClick={() => scrollTo('planos')} className="hover:text-ink-base">Planos</button>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button variant="ghost" size="sm" icon={<LogOut size={14} />} onClick={() => signOut()}>Sair</Button>
                <Button variant="primary" size="sm" icon={<ArrowRight size={14} />} onClick={() => navigate('/calculadora')}>
                  Abrir calculadora
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => openAuth('login')}>Entrar</Button>
                <Button variant="primary" size="sm" onClick={() => scrollTo('planos')}>Ver planos</Button>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-12 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
            Simule financiamentos de imóveis na planta em segundos
          </h1>
          <p className="mt-4 text-lg text-ink-muted leading-relaxed">
            Monte cenários de entrada, parcelas e intercaladas, com correção pelo INCC e
            projeção de valorização — e entregue um relatório profissional para o seu cliente.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" icon={<ArrowRight size={18} />} onClick={() => openAuth('signup')}>
              Criar conta
            </Button>
            <Button variant="secondary" size="lg" onClick={() => scrollTo('planos')}>Ver planos</Button>
          </div>
          <p className="mt-3 text-sm text-ink-faint">A partir de R$ 29,90/mês · cancele quando quiser.</p>
        </div>
        <ProductImage label="Imagem do produto (substituir)" className="h-72 md:h-96" />
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="bg-surface-card border-y border-surface-border">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Tudo que o corretor precisa para vender na planta</h2>
            <p className="text-ink-muted mt-2">Da simulação ao relatório, em um só lugar.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-surface-border p-6">
                <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-ink-base">{title}</h3>
                <p className="text-sm text-ink-muted mt-1 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <ProductImage label="Screenshot da calculadora (substituir)" className="h-80 mt-12" />
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Escolha seu plano</h2>
          <p className="text-ink-muted mt-2">Comece agora. Sem fidelidade — cancele quando quiser.</p>
        </div>
        <PlansSection onSubscribe={() => openAuth('signup')} />
        <p className="text-center text-xs text-ink-faint mt-6">
          Para assinar, crie sua conta. O checkout será habilitado em breve.
        </p>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-surface-border">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-ink-muted">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-brand-500" />
            <span className="font-semibold text-ink-base">Fluxo Pro</span>
          </div>
          <div className="flex items-center gap-2 text-ink-faint">
            <Check size={14} className="text-status-success" />
            <span>Feito para corretores de imóveis</span>
          </div>
        </div>
      </footer>

      <LoginModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </div>
  );
}
