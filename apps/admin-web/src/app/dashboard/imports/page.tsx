'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Ship, PackageCheck, Plus, Search, Anchor, CheckCircle } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { LoadingState } from '../../../components/LoadingState';
import { apiFetch } from '../../../lib/api';
import { importStatusLabel } from '../../../lib/labels';
import { PAGE } from '../../../lib/page-titles';
import { useAppDialog } from '../../../components/AppDialogProvider';

type ImportShipment = {
  id: string;
  reference: string;
  containerNumber?: string;
  status: string;
  etaDate?: string;
  receivedAt?: string;
  supplierName?: string;
};

type StatusFilter = 'all' | 'transit' | 'received';

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ImportsPage() {
  const [imports, setImports] = useState<ImportShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { confirm } = useAppDialog();

  function load() {
    setLoading(true);
    apiFetch<ImportShipment[]>('/imports').then(setImports).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: imports.length,
    transit: imports.filter((i) => i.status !== 'received').length,
    received: imports.filter((i) => i.status === 'received').length,
  }), [imports]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return imports.filter((imp) => {
      if (statusFilter === 'transit' && imp.status === 'received') return false;
      if (statusFilter === 'received' && imp.status !== 'received') return false;
      if (!q) return true;
      return imp.reference.toLowerCase().includes(q)
        || imp.containerNumber?.toLowerCase().includes(q)
        || imp.supplierName?.toLowerCase().includes(q);
    });
  }, [imports, query, statusFilter]);

  async function receive(id: string) {
    const ok = await confirm({
      title: 'Recibir en almacén',
      message: '¿Confirmar recepción en almacén? Esto sumará las cantidades al inventario.',
      confirmLabel: 'Confirmar',
    });
    if (!ok) return;
    await apiFetch(`/imports/${id}/receive`, { method: 'PATCH' });
    load();
  }

  return (
    <DashboardLayout>
      <PageHeader
        emoji={PAGE.imports.emoji}
        title={PAGE.imports.title}
        subtitle={PAGE.imports.subtitle}
        action={(
          <Link href="/dashboard/imports/new" className="btn-primary text-sm">
            <Plus size={16} /> Nueva importación
          </Link>
        )}
      />

      {!loading && imports.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Ship size={14} /> Contenedores</p>
            <p className="report-kpi-value text-slate-800">{stats.total}</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Anchor size={14} /> En tránsito</p>
            <p className="report-kpi-value text-amber-600">{stats.transit}</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><CheckCircle size={14} /> Recibidos</p>
            <p className="report-kpi-value text-emerald-700">{stats.received}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-search" placeholder="Buscar referencia, contenedor o proveedor..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="report-tabs !mb-0 shrink-0">
          {([['all', 'Todos'], ['transit', 'En tránsito'], ['received', 'Recibidos']] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setStatusFilter(id)} className={`report-tab ${statusFilter === id ? 'report-tab-active' : ''}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingState emoji="🚢" message="Cargando importaciones..." />}

      {!loading && imports.length === 0 && (
        <div className="executive-card text-center py-16 text-slate-500">
          <p className="text-4xl mb-3" aria-hidden>🚢</p>
          <p className="font-semibold text-slate-700">Sin importaciones registradas</p>
          <p className="text-sm mt-1">Registre un contenedor en camino</p>
          <Link href="/dashboard/imports/new" className="btn-primary text-sm mt-4 inline-flex">Nueva importación</Link>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((imp) => (
          <article key={imp.id} className="executive-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                imp.status === 'received' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-700'
              }`}>
                <Ship size={22} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900">{imp.reference}</p>
                <p className="text-sm text-slate-500 truncate">
                  {imp.supplierName ? `${imp.supplierName} · ` : ''}Contenedor: {imp.containerNumber || '—'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {imp.status === 'received' ? `Recibido: ${formatDate(imp.receivedAt)}` : `ETA: ${formatDate(imp.etaDate)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={imp.status === 'received' ? 'badge-green' : 'badge-amber'}>
                {importStatusLabel[imp.status] ?? imp.status}
              </span>
              {imp.status !== 'received' && (
                <button type="button" onClick={() => receive(imp.id)} className="action-chip action-chip-success">
                  <PackageCheck size={15} /> <span className="!inline">Recibir</span>
                </button>
              )}
            </div>
          </article>
        ))}
        {!loading && imports.length > 0 && !filtered.length && (
          <div className="executive-card text-center py-12 text-slate-500">Sin resultados para este filtro</div>
        )}
      </div>
    </DashboardLayout>
  );
}
