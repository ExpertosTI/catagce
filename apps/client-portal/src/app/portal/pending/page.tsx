'use client';

import { useEffect, useState } from 'react';
import PortalLayout from '../../../components/PortalLayout';
import { apiFetch } from '../../../lib/api';
import { PORTAL_PAGE } from '../../../lib/page-titles';

type Pending = {
  productName: string;
  productSku: string;
  allocatedQty: number;
  dispatchedQty: number;
  pendingQty: number;
  status: string;
};

export default function PendingMerchandisePage() {
  const [items, setItems] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Pending[]>('/portal/pending-merchandise').then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <PortalLayout>
      <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-slate-900">
        <span aria-hidden>{PORTAL_PAGE.pending.emoji}</span> {PORTAL_PAGE.pending.title}
      </h2>
      <p className="text-slate-500 mt-1 text-sm">{PORTAL_PAGE.pending.subtitle}</p>

      <div className="grid gap-3 mt-6">
        {loading && (
          <p className="text-center text-slate-400 py-12">
            <span className="text-2xl block mb-2" aria-hidden>📦</span>
            Cargando mercancía...
          </p>
        )}
        {!loading && items.map((item, i) => (
          <article key={i} className="executive-card flex justify-between items-center gap-4">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">📦 {item.productName}</h3>
              <p className="text-sm text-slate-500">{item.productSku}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-amber-600">{item.pendingQty}</p>
              <p className="text-xs text-slate-500">de {item.allocatedQty} fact. · {item.dispatchedQty} desp.</p>
            </div>
          </article>
        ))}
        {!loading && !items.length && (
          <div className="executive-card p-10 text-center text-slate-500">
            <p className="text-4xl mb-2" aria-hidden>🎉</p>
            No tiene mercancía pendiente
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
