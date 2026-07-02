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
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <span aria-hidden>{PORTAL_PAGE.pending.emoji}</span> {PORTAL_PAGE.pending.title}
      </h2>
      <p className="text-slate-500 mt-1">{PORTAL_PAGE.pending.subtitle}</p>
      <div className="grid gap-4 mt-6">
        {loading && (
          <>
            <div className="card p-5 animate-pulse h-20 bg-slate-100" />
            <div className="card p-5 animate-pulse h-20 bg-slate-100" />
          </>
        )}
        {!loading && items.map((item, i) => (
          <div key={i} className="card p-5 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{item.productName}</h3>
              <p className="text-sm text-slate-500">{item.productSku}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-600">{item.pendingQty}</p>
              <p className="text-xs text-slate-500">de {item.allocatedQty} facturados · {item.dispatchedQty} despachados</p>
            </div>
          </div>
        ))}
        {!loading && !items.length && <div className="card p-10 text-center text-slate-500">No tiene mercancía pendiente 🎉</div>}
      </div>
    </PortalLayout>
  );
}
