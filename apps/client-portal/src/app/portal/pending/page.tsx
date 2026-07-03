'use client';

import { useEffect, useMemo, useState } from 'react';
import { Package, Search, AlertTriangle, CheckCircle } from 'lucide-react';
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
  const [query, setQuery] = useState('');

  useEffect(() => {
    apiFetch<Pending[]>('/portal/pending-merchandise').then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    lines: items.length,
    pending: items.reduce((s, i) => s + i.pendingQty, 0),
    allocated: items.reduce((s, i) => s + i.allocatedQty, 0),
  }), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      i.productName.toLowerCase().includes(q) || i.productSku.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <PortalLayout>
      <div className="mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{PORTAL_PAGE.pending.title}</h2>
        <p className="text-slate-500 text-sm mt-1">{PORTAL_PAGE.pending.subtitle}</p>
      </div>

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Package size={14} /> Productos</p>
            <p className="report-kpi-value text-slate-800">{stats.lines}</p>
          </div>
          <div className="report-kpi border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white">
            <p className="text-xs text-amber-700 font-medium flex items-center gap-1"><AlertTriangle size={14} /> Por despachar</p>
            <p className="report-kpi-value text-amber-600">{stats.pending}</p>
          </div>
          <div className="report-kpi col-span-2 sm:col-span-1">
            <p className="text-xs text-slate-500 font-medium">Total facturado</p>
            <p className="report-kpi-value text-blue-700">{stats.allocated}</p>
          </div>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="relative mb-5 max-w-xl">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-search" placeholder="Buscar producto..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      <div className="grid gap-3">
        {loading && <p className="text-center text-slate-500 py-12">Cargando mercancía...</p>}

        {!loading && filtered.map((item, i) => (
          <article key={i} className="executive-card flex justify-between items-center gap-4">
            <div className="min-w-0 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Package size={18} className="text-slate-500" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{item.productName}</h3>
                <p className="text-sm text-slate-500">{item.productSku}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-extrabold text-amber-600 tabular-nums">{item.pendingQty}</p>
              <p className="text-xs text-slate-500 tabular-nums">de {item.allocatedQty} fact. · {item.dispatchedQty} desp.</p>
            </div>
          </article>
        ))}

        {!loading && !items.length && (
          <div className="executive-card p-10 text-center text-slate-500">
            <CheckCircle size={40} className="mx-auto mb-3 text-emerald-400" />
            No tiene mercancía pendiente
          </div>
        )}

        {!loading && items.length > 0 && !filtered.length && (
          <div className="executive-card p-8 text-center text-slate-500">Sin resultados para esta búsqueda</div>
        )}
      </div>
    </PortalLayout>
  );
}
