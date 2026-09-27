/**
 * Função agendada (a cada hora): retentativa e reconciliação de NFS-e.
 *
 *   - pending / error com next_attempt_at vencido e tentativas < máximo → emite de novo
 *     (o orquestrador decide o emissor, com failover para o reserva).
 *   - processing com next_attempt_at vencido → consulta o emissor e sincroniza
 *     (cobre webhook perdido).
 *
 * Notas que esgotaram as tentativas ficam em `error` para tratamento manual
 * (consultar `select * from invoices where status = 'error'`).
 */

import { sbSelect } from './lib/supabase.js';
import { processInvoice, reconcile, canRetry } from './lib/nfse/index.js';

const BATCH = 25;

export default async () => {
  const now = new Date().toISOString();
  const due = await sbSelect(
    `invoices?status=in.(pending,error,processing)&next_attempt_at=lte.${encodeURIComponent(now)}` +
      `&order=next_attempt_at.asc&limit=${BATCH}&select=*`
  );

  const summary = { retried: 0, reconciled: 0, skipped: 0 };
  for (const invoice of due || []) {
    try {
      if (invoice.status === 'processing') {
        await reconcile(invoice);
        summary.reconciled += 1;
      } else if (canRetry(invoice)) {
        await processInvoice(invoice);
        summary.retried += 1;
      } else {
        summary.skipped += 1;
      }
    } catch (err) {
      console.error('nfse-retry: falha na nota', invoice.id, err.message);
    }
  }

  console.log('nfse-retry', JSON.stringify(summary));
  return new Response(JSON.stringify(summary), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const config = {
  schedule: '@hourly',
};
