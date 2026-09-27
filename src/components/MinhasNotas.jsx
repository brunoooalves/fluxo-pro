import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Clock, AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import BillingProfileForm from './BillingProfileForm';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { fetchBillingProfile, formatTaxId } from '../utils/billingProfile';

const STATUS_UI = {
  issued: { label: 'Emitida', icon: CheckCircle2, cls: 'text-status-success' },
  processing: { label: 'Em processamento', icon: Clock, cls: 'text-status-warning' },
  pending: { label: 'Aguardando emissão', icon: Clock, cls: 'text-status-warning' },
  error: { label: 'Em análise', icon: AlertCircle, cls: 'text-status-warning' },
  canceled: { label: 'Cancelada', icon: AlertCircle, cls: 'text-ink-faint' },
};

const money = (cents) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const competence = (d) => {
  const [y, m] = String(d).split('-');
  return `${m}/${y}`;
};

/**
 * /calculadora/notas — notas fiscais (NFS-e) das cobranças da assinatura e
 * edição dos dados fiscais do tomador.
 */
export default function MinhasNotas() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState(null);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('invoices')
      .select('id, competence, amount_cents, status, invoice_number, pdf_url, xml_url, issued_at, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setInvoices(data || []));
    fetchBillingProfile().then(setProfile).catch(() => setProfile(null));
  }, [user]);

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="mb-6">
        <Link to="/calculadora" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          <ArrowLeft size={14} /> Voltar à calculadora
        </Link>
        <h1 className="text-2xl font-bold text-ink-base mt-3">Notas fiscais</h1>
        <p className="text-sm text-ink-muted mt-1">
          Uma NFS-e é emitida automaticamente a cada cobrança da sua assinatura.
        </p>
      </div>

      <Card variant="outlined" padding="md" className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-ink-base">Dados fiscais</h2>
            {profile ? (
              <p className="text-sm text-ink-muted mt-1">
                {profile.name} · {profile.tax_id_type.toUpperCase()} {formatTaxId(profile.tax_id)}
                {profile.cidade && <> · {profile.cidade}/{profile.uf}</>}
              </p>
            ) : (
              <p className="text-sm text-status-warning-text mt-1">
                Informe seu CPF ou CNPJ para que as notas possam ser emitidas.
              </p>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            {profile ? 'Editar' : 'Preencher'}
          </Button>
        </div>
      </Card>

      {invoices === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-brand-500" size={24} />
        </div>
      ) : invoices.length === 0 ? (
        <Card variant="outlined" padding="lg" className="text-center">
          <FileText size={32} className="mx-auto text-ink-faint mb-2" />
          <p className="text-sm text-ink-muted">Nenhuma nota emitida ainda. A primeira aparece após a confirmação do pagamento.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {invoices.map((inv) => {
            const ui = STATUS_UI[inv.status] || STATUS_UI.pending;
            const Icon = ui.icon;
            return (
              <li key={inv.id}>
                <Card variant="outlined" padding="md">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Icon size={20} className={ui.cls} />
                      <div>
                        <p className="font-medium text-ink-base">
                          Competência {competence(inv.competence)}
                          {inv.invoice_number && <span className="text-ink-faint font-normal"> · nº {inv.invoice_number}</span>}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {money(inv.amount_cents)} · {ui.label}
                          {inv.issued_at && <> em {new Date(inv.issued_at).toLocaleDateString('pt-BR')}</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {inv.pdf_url && (
                        <a href={inv.pdf_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-3 py-1.5 text-sm text-ink-base hover:bg-surface-hover">
                          <Download size={14} /> PDF
                        </a>
                      )}
                      {inv.xml_url && (
                        <a href={inv.xml_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-3 py-1.5 text-sm text-ink-base hover:bg-surface-hover">
                          <Download size={14} /> XML
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title="Dados fiscais" size="lg">
        <BillingProfileForm
          user={user}
          initial={profile}
          submitLabel="Salvar"
          onCancel={() => setEditing(false)}
          onSaved={(p) => { setProfile(p); setEditing(false); }}
        />
      </Modal>
    </div>
  );
}
