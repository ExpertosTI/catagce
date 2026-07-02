'use client';

import { useEffect, useState } from 'react';
import DashboardLayout, { PageHeader, ActionButton } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';

export default function DispatchesPage() {
  const [pending, setPending] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/invoices/pending-dispatch').then(setPending).catch(console.error);
    apiFetch('/invoices/dispatches/history').then(setHistory).catch(console.error);
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="Despachos" subtitle="Pendientes e historial" action={<ActionButton href="/dashboard/dispatches/new" label="Nuevo despacho" />} />

      <h2 className="font-semibold text-lg mb-3">Pendientes de despacho</h2>
      <div className="card overflow-hidden mb-8">
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
            {pending.map((item, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="p-4">{item.clientName}</td>
                <td className="p-4">{item.productName}</td>
                <td className="p-4 text-right">{item.allocatedQty}</td>
                <td className="p-4 text-right">{item.dispatchedQty}</td>
                <td className="p-4 text-right font-medium text-amber-700">{item.pendingQty}</td>
              </tr>
            ))}
            {!pending.length && <tr><td colSpan={5} className="p-8 text-center text-slate-500">Sin pendientes</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 className="font-semibold text-lg mb-3">Historial de despachos</h2>
      <div className="space-y-3">
        {history.map((d) => (
          <div key={d.id} className="card p-5">
            <div className="flex justify-between">
              <div>
                <p className="font-bold">{d.reference}</p>
                <p className="text-sm text-slate-500">{d.clientName} · {d.invoiceReference && `Factura ${d.invoiceReference}`}</p>
              </div>
              <span className="badge-green capitalize">{d.status}</span>
            </div>
            <ul className="mt-3 text-sm space-y-1">
              {d.items?.map((item: any, i: number) => (
                <li key={i}>{item.productName} — {item.quantity} un.</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
