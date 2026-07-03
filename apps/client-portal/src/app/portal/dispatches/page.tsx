'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Truck, Package, FileText, Search, Calendar, CheckCircle } from 'lucide-react';
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
  const [query, setQuery] = useState('');

  useEffect(() => {
    apiFetch<Dispatch[]>('/portal/dispatches').then(setDispatches).catch(console.error).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    total: dispatches.length,
    units: dispatches.reduce((s, d) => s + d.items.reduce((u, i) => u + i.quantity, 0), 0),
  }), [dispatches]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dispatches;
    return dispatches.filter((d) =>
      d.reference.toLowerCase().includes(q)
      || d.invoiceReference?.toLowerCase().includes(q)
      || d.items.some((i) => i.productName.toLowerCase().includes(q)),
    );
  }, [dispatches, query]);

  return (
    <PortalLayout>
      <div className="mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{PORTAL_PAGE.dispatches.title}</h2>
        <p className="text-slate-500 text-sm mt-1">{PORTAL_PAGE.dispatches.subtitle}</p>
      </div>

      {!loading && dispatches.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5 max-w-md">
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Truck size={14} /> Despachos</p>
            <p className="report-kpi-value text-slate-800">{stats.total}</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Package size={14} /> Unidades entregadas</p>
            <p className="report-kpi-value text-emerald-700">{stats.units}</p>
          </div>
        </div>
      )}

      {!loading && dispatches.length > 0 && (
        <div className="relative mb-5 max-w-xl">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-search" placeholder="Buscar despacho o producto..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      <div className="space-y-3">
        {loading && <p className="text-center text-slate-500 py-12">Cargando despachos...</p>}

        {!loading && filtered.map((d) => (
          <article key={d.id} className="executive-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <Truck size={18} className="text-blue-600 shrink-0" /> {d.reference}
                </p>
                {d.invoiceReference && (
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                    <FileText size={14} /> Factura: {d.invoiceReference}
                  </p>
                )}
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                  <Calendar size={14} />
                  {d.dispatchedAt ? new Date(d.dispatchedAt).toLocaleDateString('es-DO', { dateStyle: 'long' }) : '—'}
                </p>
              </div>
              <span className="badge-green shrink-0 flex items-center gap-1">
                <CheckCircle size={12} /> {dispatchStatusLabel[d.status] ?? d.status}
              </span>
            </div>
            <ul className="mt-4 border-t border-slate-100 pt-4 space-y-2">
              {d.items.map((item, i) => (
                <li key={i} className="flex justify-between text-sm text-slate-700 gap-3">
                  <span className="truncate flex items-center gap-2 min-w-0">
                    <Package size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">{item.productName}</span>
                    <span className="text-slate-400 shrink-0 hidden sm:inline">({item.productSku})</span>
                  </span>
                  <span className="font-semibold tabular-nums shrink-0">{item.quantity} un.</span>
                </li>
              ))}
            </ul>
            {d.notes && <p className="text-sm text-slate-500 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 italic">{d.notes}</p>}
          </article>
        ))}

        {!loading && !dispatches.length && (
          <div className="executive-card p-10 text-center text-slate-500">
            <Truck size={40} className="mx-auto mb-3 text-slate-300" />
            Aún no tiene despachos registrados
          </div>
        )}

        {!loading && dispatches.length > 0 && !filtered.length && (
          <div className="executive-card p-8 text-center text-slate-500">Sin resultados para esta búsqueda</div>
        )}
      </div>
    </PortalLayout>
  );
}
