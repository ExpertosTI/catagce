'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingCart, Clock, CheckCircle, ChevronRight } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { LoadingState } from '../../../components/LoadingState';
import { EmptyState } from '../../../components/EmptyState';
import { apiFetch } from '../../../lib/api';
import { formatCurrency } from '../../../lib/currency';
import { presaleStatusLabel } from '../../../lib/labels';
import { PAGE } from '../../../lib/page-titles';

type Presale = {
  id: string;
  reference: string;
  clientName: string;
  status: string;
  totalAmount: string;
};

type StatusFilter = 'all' | 'open' | 'confirmed';

export default function PresalesPage() {
  const [presales, setPresales] = useState<Presale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    apiFetch<Presale[]>('/catalogs/presales')
      .then(setPresales)
      .catch(() => setError('No se pudieron cargar las preventas'))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    total: presales.length,
    amount: presales.reduce((s, p) => s + parseFloat(p.totalAmount || '0'), 0),
    pending: presales.filter((p) => p.status === 'open').length,
  }), [presales]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return presales.filter((p) => {
      if (statusFilter === 'open' && p.status !== 'open') return false;
      if (statusFilter === 'confirmed' && p.status !== 'confirmed') return false;
      if (!q) return true;
      return p.reference.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q);
    });
  }, [presales, query, statusFilter]);

  return (
    <DashboardLayout>

      {!loading && !error && presales.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><ShoppingCart size={14} /> Preventas</p>
            <p className="report-kpi-value text-slate-800">{stats.total}</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium">Valor total</p>
            <p className="report-kpi-value text-blue-700">{formatCurrency(stats.amount)}</p>
          </div>
          <div className="report-kpi col-span-2 lg:col-span-1">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Clock size={14} /> Por confirmar</p>
            <p className="report-kpi-value text-amber-600">{stats.pending}</p>
          </div>
        </div>
      )}

      {!loading && !error && presales.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input-search" placeholder="Buscar referencia o cliente..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="report-tabs !mb-0 shrink-0">
            {([['all', 'Todas'], ['open', 'Abiertas'], ['confirmed', 'Confirmadas']] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setStatusFilter(id)} className={`report-tab ${statusFilter === id ? 'report-tab-active' : ''}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <LoadingState message="Cargando preventas..." />}
      {!loading && error && <div className="executive-card p-8 text-center text-red-600">{error}</div>}

      {!loading && !error && presales.length === 0 && (
        <EmptyState icon={ShoppingCart} title="Sin preventas" subtitle="Se crean cuando los clientes piden desde el catálogo público" />
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {!loading && !error && filtered.map((p) => (
          <Link key={p.id} href={`/dashboard/presales/${p.id}`} className="executive-card hover:shadow-md transition-all hover:-translate-y-px group block">
            <div className="flex justify-between gap-2 mb-2">
              <p className="font-bold text-slate-900">{p.reference}</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                p.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                p.status === 'converted' ? 'bg-blue-50 text-blue-700' :
                p.status === 'cancelled' ? 'bg-slate-100 text-slate-500' : 'badge-amber'
              }`}>
                {presaleStatusLabel[p.status] ?? p.status}
              </span>
            </div>
            <p className="text-sm text-slate-600">{p.clientName}</p>
            <div className="flex items-end justify-between mt-2">
              <p className="text-xl font-extrabold text-blue-700 tabular-nums">{formatCurrency(p.totalAmount)}</p>
              <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600 transition" />
            </div>
            {p.status === 'confirmed' && (
              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1"><CheckCircle size={12} /> Lista para facturar</p>
            )}
          </Link>
        ))}
      </div>

      {!loading && !error && presales.length > 0 && !filtered.length && (
        <div className="executive-card text-center py-12 text-slate-500 mt-4">Sin resultados para este filtro</div>
      )}
    </DashboardLayout>
  );
}
