'use client';

import { useEffect, useState } from 'react';
import DashboardLayout, { PageHeader, ActionButton, SectionTitle } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';
import { dispatchStatusLabel } from '../../../lib/labels';
import { PAGE } from '../../../lib/page-titles';

export default function DispatchesPage() {
  const [pending, setPending] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/invoices/pending-dispatch').then(setPending).catch(console.error),
      apiFetch('/invoices/dispatches/history').then(setHistory).catch(console.error),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <PageHeader
        emoji={PAGE.dispatches.emoji}
        title={PAGE.dispatches.title}
        subtitle={PAGE.dispatches.subtitle}
        action={<ActionButton href="/dashboard/dispatches/new" emoji="📤" label="Nuevo despacho" />}
      />

      <SectionTitle emoji="⏳">Pendientes de despacho</SectionTitle>
      <div className="executive-card overflow-hidden mb-8 !p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b">
            <tr>
              <th className="text-left p-4">Cliente</th>
              <th className="text-left p-4">Producto</th>
              <th className="text-right p-4">Facturado</th>
              <th className="text-right p-4">Despachado</th>
              <th className="text-right p-4">Pendiente</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">🚚 Cargando...</td></tr>
            )}
            {!loading && pending.map((item, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/60">
                <td className="p-4">{item.clientName}</td>
                <td className="p-4">{item.productName}</td>
                <td className="p-4 text-right">{item.allocatedQty}</td>
                <td className="p-4 text-right">{item.dispatchedQty}</td>
                <td className="p-4 text-right font-medium text-amber-700">{item.pendingQty}</td>
              </tr>
            ))}
            {!loading && !pending.length && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">✅ Sin pendientes de despacho</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <SectionTitle emoji="📋">Historial de despachos</SectionTitle>
      <div className="space-y-3">
        {loading && <div className="executive-card p-8 text-center text-slate-400">🚚 Cargando historial...</div>}
        {!loading && history.map((d) => (
          <article key={d.id} className="executive-card">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900">📦 {d.reference}</p>
                <p className="text-sm text-slate-500">{d.clientName} · {d.invoiceReference && `Factura ${d.invoiceReference}`}</p>
              </div>
              <span className="badge-green shrink-0">{dispatchStatusLabel[d.status] ?? d.status}</span>
            </div>
            <ul className="mt-3 text-sm space-y-1 text-slate-600">
              {d.items?.map((item: any, i: number) => (
                <li key={i}>• {item.productName} — {item.quantity} un.</li>
              ))}
            </ul>
          </article>
        ))}
        {!loading && !history.length && (
          <div className="executive-card p-8 text-center text-slate-500">
            <p className="text-3xl mb-2" aria-hidden>🚚</p>
            Sin despachos registrados todavía
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
