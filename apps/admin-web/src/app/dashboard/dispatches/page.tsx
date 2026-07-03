'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Truck, Package, Printer, FileDown, Plus, Search, Clock, ClipboardList, CheckCircle2 } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { ReportTableCard } from '../../../components/ReportTableCard';
import { LoadingState } from '../../../components/LoadingState';
import { apiFetch } from '../../../lib/api';
import { dispatchStatusLabel } from '../../../lib/labels';
import { exportCsv, printReportTable } from '../../../lib/report-utils';
import { useCompany } from '../../../lib/useCompany';
import { PAGE } from '../../../lib/page-titles';

type PendingItem = {
  clientName: string;
  productName: string;
  allocatedQty: number;
  dispatchedQty: number;
  pendingQty: number;
};

type DispatchHistory = {
  id: string;
  reference: string;
  clientName: string;
  invoiceReference?: string;
  status: string;
  items?: Array<{ productName: string; quantity: number }>;
};

export default function DispatchesPage() {
  const company = useCompany();
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [history, setHistory] = useState<DispatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<PendingItem[]>('/invoices/pending-dispatch').then(setPending).catch(() => setPending([])),
      apiFetch<DispatchHistory[]>('/invoices/dispatches/history').then(setHistory).catch(() => setHistory([])),
    ]).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    lines: pending.length,
    units: pending.reduce((s, p) => s + (p.pendingQty ?? 0), 0),
    dispatched: history.length,
  }), [pending, history]);

  const filteredPending = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter((p) => p.clientName?.toLowerCase().includes(q) || p.productName?.toLowerCase().includes(q));
  }, [pending, query]);

  function printPending() {
    printReportTable({
      title: 'Pendientes de despacho',
      companyName: company?.name,
      subtitle: `${stats.units} unidades en ${stats.lines} líneas`,
      columns: ['Cliente', 'Producto', 'Facturado', 'Despachado', 'Pendiente'],
      rows: filteredPending.map((p) => [p.clientName, p.productName, p.allocatedQty, p.dispatchedQty, p.pendingQty]),
      totalsRow: ['', '', '', 'Total pendiente', stats.units],
    });
  }

  function exportPending() {
    exportCsv('despachos-pendientes', ['Cliente', 'Producto', 'Facturado', 'Despachado', 'Pendiente'],
      filteredPending.map((p) => [p.clientName, p.productName, p.allocatedQty, p.dispatchedQty, p.pendingQty]));
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={PAGE.dispatches.title}
        subtitle={PAGE.dispatches.subtitle}
        action={(
          <Link href="/dashboard/dispatches/new" className="btn-primary text-sm">
            <Plus size={16} /> Nuevo despacho
          </Link>
        )}
      />

      {!loading && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Package size={14} /> Líneas pendientes</p>
            <p className="report-kpi-value text-amber-600">{stats.lines}</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Truck size={14} /> Unidades por entregar</p>
            <p className="report-kpi-value text-orange-600">{stats.units}</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-500" /> Despachos hechos</p>
            <p className="report-kpi-value text-emerald-700">{stats.dispatched}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-search" placeholder="Buscar cliente o producto..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportPending} disabled={!filteredPending.length} className="report-toolbar-btn disabled:opacity-40">
            <FileDown size={14} /> CSV
          </button>
          <button type="button" onClick={printPending} disabled={!filteredPending.length} className="report-toolbar-btn disabled:opacity-40">
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>

      {loading && <LoadingState message="Cargando despachos..." />}

      {!loading && (
        <ReportTableCard
          icon={<Clock size={16} className="text-amber-500" />}
          title="Pendientes de despacho"
          subtitle={filteredPending.length ? `${stats.units} unidades por entregar` : 'Todo despachado'}
        >
          <table className="w-full text-sm min-w-[480px] report-table">
            <thead className="border-b">
              <tr>
                <th className="text-left">Cliente</th>
                <th className="text-left">Producto</th>
                <th className="text-right">Facturado</th>
                <th className="text-right">Despachado</th>
                <th className="text-right">Pendiente</th>
              </tr>
            </thead>
            <tbody>
              {filteredPending.map((item, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="font-medium">{item.clientName}</td>
                  <td>{item.productName}</td>
                  <td className="text-right text-slate-500">{item.allocatedQty}</td>
                  <td className="text-right text-slate-500">{item.dispatchedQty}</td>
                  <td className="text-right font-bold text-amber-700">{item.pendingQty}</td>
                </tr>
              ))}
              {!filteredPending.length && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2 justify-center"><CheckCircle2 size={16} className="text-emerald-500" /> Sin pendientes de despacho</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ReportTableCard>
      )}

      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mt-8 mb-3">
        <ClipboardList size={16} className="text-slate-500" /> Historial de despachos
      </h2>

      <div className="space-y-3">
        {!loading && history.map((d) => (
          <article key={d.id} className="executive-card hover:shadow-md transition-shadow">
            <div className="flex justify-between gap-3 items-start">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <Truck size={18} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{d.reference}</p>
                  <p className="text-sm text-slate-500">{d.clientName}{d.invoiceReference ? ` · Factura ${d.invoiceReference}` : ''}</p>
                </div>
              </div>
              <span className="badge-green shrink-0">{dispatchStatusLabel[d.status] ?? d.status}</span>
            </div>
            <ul className="mt-3 text-sm space-y-1 text-slate-600 ml-12">
              {d.items?.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span>{item.productName}</span>
                  <span className="font-semibold">{item.quantity} un.</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
        {!loading && !history.length && (
          <div className="executive-card p-10 text-center text-slate-500">
            <Truck size={32} className="mx-auto mb-2 text-slate-300" />
            Sin despachos registrados todavía
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
