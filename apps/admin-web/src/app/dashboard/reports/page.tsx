'use client';

import { useEffect, useState } from 'react';
import { FileDown, Printer, AlertTriangle } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';
import { formatCurrency } from '../../../lib/currency';
import { exportCsv, printReportTable } from '../../../lib/report-utils';
import { useCompany } from '../../../lib/useCompany';
import { REPORT_TABS, PAGE } from '../../../lib/page-titles';

type Tab = 'ar' | 'sales' | 'inventory';

type ArData = {
  totalPending: number;
  buckets: { corriente: number; dias1a30: number; dias31a60: number; dias61a90: number; dias90mas: number };
  clients: Array<{ clientId: string; clientName: string; clientCode?: string; totalBalance: number; invoiceCount: number; oldestDueDate: string | null }>;
};

type SalesData = {
  totalFacturado: number; totalCobrado: number; totalPendiente: number;
  totalCredito: number; totalContado: number; cantidadFacturas: number;
  topClients: Array<{ clientName: string; total: number; count: number }>;
  invoices: Array<{ reference: string; invoiceType: string; status: string; totalAmount: string; paidAmount: string; issuedAt: string; clientName: string }>;
};

type InventoryData = {
  products: Array<{
    productId: string; sku: string; name: string; totalQty: number; reservedQty: number;
    dispatchedQty: number; availableQty: number; minStock: number; valuacionCosto: number; valuacionVenta: number; bajoStock: boolean;
  }>;
  totalValuacionCosto: number; totalValuacionVenta: number; lowStockCount: number;
};

const TABS = REPORT_TABS;

export default function ReportsPage() {
  const company = useCompany();
  const [tab, setTab] = useState<Tab>('ar');
  const [ar, setAr] = useState<ArData | null>(null);
  const [sales, setSales] = useState<SalesData | null>(null);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  function loadAr() {
    return apiFetch<ArData>('/reports/accounts-receivable').then(setAr);
  }
  function loadInventory() {
    return apiFetch<InventoryData>('/reports/inventory').then(setInventory);
  }
  function loadSales() {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return apiFetch<SalesData>(`/reports/sales${qs ? `?${qs}` : ''}`).then(setSales);
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([loadAr(), loadSales(), loadInventory()])
      .catch(() => setError('No se pudieron cargar los reportes'))
      .finally(() => setLoading(false));
  }, []);

  function refreshSales() {
    setLoading(true);
    loadSales().catch(() => setError('No se pudo cargar el reporte de ventas')).finally(() => setLoading(false));
  }

  return (
    <DashboardLayout>
      <PageHeader emoji={PAGE.reports.emoji} title={PAGE.reports.title} subtitle={PAGE.reports.subtitle} />

      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${
              tab === t.id ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="card p-10 text-center text-slate-400">Cargando reportes...</div>}
      {!loading && error && <div className="card p-10 text-center text-red-600">{error}</div>}

      {!loading && !error && tab === 'ar' && ar && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Corriente', value: ar.buckets.corriente, cls: 'text-emerald-700' },
              { label: '1-30 días', value: ar.buckets.dias1a30, cls: 'text-amber-600' },
              { label: '31-60 días', value: ar.buckets.dias31a60, cls: 'text-orange-600' },
              { label: '61-90 días', value: ar.buckets.dias61a90, cls: 'text-red-600' },
              { label: '90+ días', value: ar.buckets.dias90mas, cls: 'text-red-800' },
            ].map((b) => (
              <div key={b.label} className="stat-card">
                <p className="text-xs text-slate-500">{b.label}</p>
                <p className={`text-base font-bold mt-1 ${b.cls}`}>{formatCurrency(b.value)}</p>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold text-sm">Saldo por cliente</p>
                <p className="text-xs text-slate-500">Total pendiente: <span className="font-bold text-red-600">{formatCurrency(ar.totalPending)}</span></p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => exportCsv('cuentas-por-cobrar', ['Cliente', 'Código', 'Facturas', 'Saldo', 'Vencimiento más antiguo'],
                    ar.clients.map((c) => [c.clientName, c.clientCode ?? '', c.invoiceCount, c.totalBalance.toFixed(2), c.oldestDueDate ? new Date(c.oldestDueDate).toLocaleDateString('es-DO') : '—']))}
                  className="btn-action btn-action-secondary text-xs"
                ><FileDown size={14} /> CSV</button>
                <button
                  type="button"
                  onClick={() => printReportTable({
                    title: 'Cuentas por cobrar', companyName: company?.name, subtitle: `Total pendiente: ${formatCurrency(ar.totalPending)}`,
                    columns: ['Cliente', 'Código', 'Facturas', 'Vencimiento más antiguo', 'Saldo'],
                    rows: ar.clients.map((c) => [c.clientName, c.clientCode ?? '', c.invoiceCount, c.oldestDueDate ? new Date(c.oldestDueDate).toLocaleDateString('es-DO') : '—', formatCurrency(c.totalBalance)]),
                    totalsRow: ['', '', '', 'Total', formatCurrency(ar.totalPending)],
                  })}
                  className="btn-action btn-action-secondary text-xs"
                ><Printer size={14} /> Imprimir</button>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b">
                <tr>
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-right p-3">Facturas</th>
                  <th className="text-right p-3">Vencimiento más antiguo</th>
                  <th className="text-right p-3">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {ar.clients.map((c) => (
                  <tr key={c.clientId} className="border-b border-slate-100">
                    <td className="p-3 font-medium">{c.clientName}</td>
                    <td className="p-3 text-right">{c.invoiceCount}</td>
                    <td className="p-3 text-right text-slate-500">{c.oldestDueDate ? new Date(c.oldestDueDate).toLocaleDateString('es-DO') : '—'}</td>
                    <td className="p-3 text-right font-semibold text-red-600">{formatCurrency(c.totalBalance)}</td>
                  </tr>
                ))}
                {!ar.clients.length && <tr><td colSpan={4} className="p-8 text-center text-slate-500">Sin cuentas pendientes 🎉</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && tab === 'sales' && sales && (
        <div className="space-y-4">
          <div className="card p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="form-label">Desde</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="form-label">Hasta</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input text-sm" />
            </div>
            <button type="button" onClick={refreshSales} className="btn-primary text-sm">Filtrar</button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total facturado', value: sales.totalFacturado, cls: 'text-blue-700' },
              { label: 'Total cobrado', value: sales.totalCobrado, cls: 'text-emerald-700' },
              { label: 'Saldo pendiente', value: sales.totalPendiente, cls: 'text-red-600' },
              { label: `Facturas (${sales.cantidadFacturas})`, value: sales.totalCredito + sales.totalContado, cls: 'text-slate-700' },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-lg font-bold mt-1 ${s.cls}`}>{formatCurrency(s.value)}</p>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between flex-wrap gap-2">
              <p className="font-semibold text-sm">Principales clientes</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => exportCsv('ventas-por-cliente', ['Cliente', 'Facturas', 'Total'], sales.topClients.map((c) => [c.clientName, c.count, c.total.toFixed(2)]))}
                  className="btn-action btn-action-secondary text-xs"
                ><FileDown size={14} /> CSV</button>
                <button
                  type="button"
                  onClick={() => printReportTable({
                    title: 'Resumen de ventas', companyName: company?.name,
                    subtitle: `${from || 'Inicio'} — ${to || 'Hoy'}`,
                    columns: ['Cliente', 'Facturas', 'Total'],
                    rows: sales.topClients.map((c) => [c.clientName, c.count, formatCurrency(c.total)]),
                    totalsRow: ['', 'Total facturado', formatCurrency(sales.totalFacturado)],
                  })}
                  className="btn-action btn-action-secondary text-xs"
                ><Printer size={14} /> Imprimir</button>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b">
                <tr><th className="text-left p-3">Cliente</th><th className="text-right p-3">Facturas</th><th className="text-right p-3">Total</th></tr>
              </thead>
              <tbody>
                {sales.topClients.map((c) => (
                  <tr key={c.clientName} className="border-b border-slate-100">
                    <td className="p-3 font-medium">{c.clientName}</td>
                    <td className="p-3 text-right">{c.count}</td>
                    <td className="p-3 text-right font-semibold text-blue-700">{formatCurrency(c.total)}</td>
                  </tr>
                ))}
                {!sales.topClients.length && <tr><td colSpan={3} className="p-8 text-center text-slate-500">Sin ventas en este período</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && tab === 'inventory' && inventory && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="stat-card">
              <p className="text-xs text-slate-500">Valorización (costo)</p>
              <p className="text-lg font-bold mt-1 text-blue-700">{formatCurrency(inventory.totalValuacionCosto)}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs text-slate-500">Valorización (venta)</p>
              <p className="text-lg font-bold mt-1 text-emerald-700">{formatCurrency(inventory.totalValuacionVenta)}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs text-slate-500">Productos bajo stock mínimo</p>
              <p className="text-lg font-bold mt-1 text-amber-600 flex items-center gap-1.5">
                {inventory.lowStockCount > 0 && <AlertTriangle size={16} />} {inventory.lowStockCount}
              </p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between flex-wrap gap-2">
              <p className="font-semibold text-sm">Inventario disponible</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => exportCsv('reporte-inventario', ['SKU', 'Producto', 'Disponible', 'Reservado', 'Despachado', 'Mínimo', 'Valorización costo'],
                    inventory.products.map((p) => [p.sku, p.name, p.availableQty, p.reservedQty, p.dispatchedQty, p.minStock, p.valuacionCosto.toFixed(2)]))}
                  className="btn-action btn-action-secondary text-xs"
                ><FileDown size={14} /> CSV</button>
                <button
                  type="button"
                  onClick={() => printReportTable({
                    title: 'Reporte de inventario', companyName: company?.name,
                    subtitle: `Valorización total: ${formatCurrency(inventory.totalValuacionCosto)}`,
                    columns: ['SKU', 'Producto', 'Disponible', 'Mínimo', 'Valorización'],
                    rows: inventory.products.map((p) => [p.sku, p.name, p.availableQty, p.minStock, formatCurrency(p.valuacionCosto)]),
                    totalsRow: ['', '', '', 'Total', formatCurrency(inventory.totalValuacionCosto)],
                  })}
                  className="btn-action btn-action-secondary text-xs"
                ><Printer size={14} /> Imprimir</button>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b">
                <tr>
                  <th className="text-left p-3">Producto</th>
                  <th className="text-right p-3">Disponible</th>
                  <th className="text-right p-3">Reservado</th>
                  <th className="text-right p-3">Mínimo</th>
                  <th className="text-right p-3">Valorización</th>
                </tr>
              </thead>
              <tbody>
                {inventory.products.map((p) => (
                  <tr key={p.productId} className={`border-b border-slate-100 ${p.bajoStock ? 'bg-amber-50/60' : ''}`}>
                    <td className="p-3">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-slate-400 text-xs block">{p.sku}</span>
                    </td>
                    <td className={`p-3 text-right font-semibold ${p.bajoStock ? 'text-amber-700' : ''}`}>
                      {p.availableQty} {p.bajoStock && <AlertTriangle size={13} className="inline ml-1 -mt-0.5" />}
                    </td>
                    <td className="p-3 text-right text-slate-500">{p.reservedQty}</td>
                    <td className="p-3 text-right text-slate-500">{p.minStock}</td>
                    <td className="p-3 text-right">{formatCurrency(p.valuacionCosto)}</td>
                  </tr>
                ))}
                {!inventory.products.length && <tr><td colSpan={5} className="p-8 text-center text-slate-500">Sin productos en inventario</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
