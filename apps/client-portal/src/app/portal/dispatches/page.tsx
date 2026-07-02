'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PortalLayout from '../../../components/PortalLayout';
import { apiFetch } from '../../../lib/api';
import { dispatchStatusLabel } from '../../../lib/labels';
import { PORTAL_PAGE } from '../../../lib/page-titles';

type Dispatch = {
  id: string;
  reference: string;
  status: string;
  dispatchedAt: string;
  invoiceReference?: string;
  notes?: string;
  items: { quantity: number; productName: string; productSku: string }[];
};

export default function ClientDispatchesPage() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Dispatch[]>('/portal/dispatches').then(setDispatches).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <PortalLayout>
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <span aria-hidden>{PORTAL_PAGE.dispatches.emoji}</span> {PORTAL_PAGE.dispatches.title}
      </h2>
      <p className="text-slate-500 mt-1">{PORTAL_PAGE.dispatches.subtitle}</p>

      <div className="mt-6 space-y-4">
        {loading && (
          <>
            <div className="card p-6 animate-pulse h-24 bg-slate-100" />
            <div className="card p-6 animate-pulse h-24 bg-slate-100" />
          </>
        )}
        {!loading && dispatches.map((d) => (
          <div key={d.id} className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-bold text-lg">{d.reference}</p>
                {d.invoiceReference && <p className="text-sm text-slate-500">Factura: {d.invoiceReference}</p>}
                <p className="text-sm text-slate-500 mt-1">
                  {d.dispatchedAt ? new Date(d.dispatchedAt).toLocaleDateString('es-PA', { dateStyle: 'long' }) : '—'}
                </p>
              </div>
              <span className="badge-green">{dispatchStatusLabel[d.status] ?? d.status}</span>
            </div>
            <ul className="mt-4 border-t border-slate-100 pt-4 space-y-2">
              {d.items.map((item, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span>{item.productName} <span className="text-slate-400">({item.productSku})</span></span>
                  <span className="font-medium">{item.quantity} un.</span>
                </li>
              ))}
            </ul>
            {d.notes && <p className="text-sm text-slate-500 mt-3 italic">{d.notes}</p>}
          </div>
        ))}
        {!loading && !dispatches.length && (
          <div className="card p-10 text-center text-slate-500">Aún no tiene despachos registrados</div>
        )}
      </div>
    </PortalLayout>
  );
}
