'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileDown, Printer, AlertTriangle, Wallet, TrendingUp, Package, Users, Calendar, Search, CheckCircle, CircleDot } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { LoadingState } from '../../../components/LoadingState';
import { ReportTableCard } from '../../../components/ReportTableCard';
import { apiFetch } from '../../../lib/api';
import { formatCurrency } from '../../../lib/currency';
import { exportCsv, printReportTable } from '../../../lib/report-utils';
import { useCompany } from '../../../lib/useCompany';
import { PAGE } from '../../../lib/page-titles';

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
};

type InventoryData = {
  products: Array<{
    productId: string; sku: string; name: string; availableQty: number; reservedQty: number;
    minStock: number; valuacionCosto: number; bajoStock: boolean;
  }>;
  totalValuacionCosto: number; totalValuacionVenta: number; lowStockCount: number;
};

const TAB_CONFIG = [
  { id: 'ar' as const, label: 'Cuentas por cobrar', icon: Wallet },
  { id: 'sales' as const, label: 'Ventas', icon: TrendingUp },
  { id: 'inventory' as const, label: 'Inventario', icon: Package },
];

const AR_BUCKETS = [
  { icon: CheckCircle, label: 'Corriente', key: 'corriente' as const, cls: 'text-emerald-700', iconCls: 'text-emerald-500' },
  { icon: CircleDot, label: '1-30 días', key: 'dias1a30' as const, cls: 'text-amber-600', iconCls: 'text-amber-500' },
  { icon: CircleDot, label: '31-60 días', key: 'dias31a60' as const, cls: 'text-orange-600', iconCls: 'text-orange-500' },
  { icon: CircleDot, label: '61-90 días', key: 'dias61a90' as const, cls: 'text-red-600', iconCls: 'text-red-500' },
  { icon: AlertTriangle, label: '90+ días', key: 'dias90mas' as const, cls: 'text-red-800', iconCls: 'text-red-600' },
];

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

  function loadAr() { return apiFetch<ArData>('/reports/accounts-receivable').then(setAr); }
  function loadInventory() { return apiFetch<InventoryData>('/reports/inventory').then(setInventory); }
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

  function exportBtn(onClick: () => void) {
    return (
      <button type="button" onClick={onClick} className="report-toolbar-btn">
        <FileDown size={14} /> CSV
      </button>
    );
  }

  function printBtn(onClick: () => void) {
    return (
      <button type="button" onClick={onClick} className="report-toolbar-btn">
        <Printer size={14} /> Imprimir
      </button>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader emoji={PAGE.reports.emoji} title={PAGE.reports.title} subtitle={PAGE.reports.subtitle} />

      <div className="report-tabs">
        {TAB_CONFIG.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`report-tab ${tab === t.id ? 'report-tab-active' : 'hover:text-slate-700'}`}
            >
              <Icon size={15} className="inline -mt-0.5 mr-1" /> {t.label}
            </button>
          );
        })}
      </div>

      {loading && <LoadingState message="Cargando reportes..." />}
      {!loading && error && (
        <div className="executive-card p-10 text-center text-red-600">{error}</div>
      )}

      {!loading && !error && tab === 'ar' && ar && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {AR_BUCKETS.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.key} className="report-kpi">
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                    <Icon size={14} className={b.iconCls} /> {b.label}
                  </p>
                  <p className={`report-kpi-value ${b.cls}`}>{formatCurrency(ar.buckets[b.key])}</p>
                </div>
              );
            })}
          </div>

          <ReportTableCard
            title="Saldo por cliente"
            subtitle={`Total pendiente: ${formatCurrency(ar.totalPending)}`}
            actions={(
              <>
                {exportBtn(() => exportCsv('cuentas-por-cobrar', ['Cliente', 'Código', 'Facturas', 'Saldo', 'Vencimiento más antiguo'],
                  ar.clients.map((c) => [c.clientName, c.clientCode ?? '', c.invoiceCount, c.totalBalance.toFixed(2), c.oldestDueDate ? new Date(c.oldestDueDate).toLocaleDateString('es-DO') : '—'])))}
                {printBtn(() => printReportTable({
                  title: 'Cuentas por cobrar', companyName: company?.name, subtitle: `Total pendiente: ${formatCurrency(ar.totalPending)}`,
                  columns: ['Cliente', 'Código', 'Facturas', 'Vencimiento más antiguo', 'Saldo'],
                  rows: ar.clients.map((c) => [c.clientName, c.clientCode ?? '', c.invoiceCount, c.oldestDueDate ? new Date(c.oldestDueDate).toLocaleDateString('es-DO') : '—', formatCurrency(c.totalBalance)]),
                  totalsRow: ['', '', '', 'Total', formatCurrency(ar.totalPending)],
                }))}
              </>
            )}
          >
            <table className="w-full text-sm min-w-[480px]">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-right p-3">Facturas</th>
                  <th className="text-right p-3 hidden sm:table-cell">Vencimiento</th>
                  <th className="text-right p-3">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {ar.clients.map((c) => (
                  <tr key={c.clientId} className="border-b border-slate-100">
                    <td className="p-3">
                      <Link href={`/dashboard/clients/${c.clientId}`} className="font-medium text-blue-700 hover:underline">
                        {c.clientName}
                      </Link>
                      <span className="text-xs text-slate-400 block sm:hidden">{c.invoiceCount} facturas</span>
                    </td>
                    <td className="p-3 text-right hidden sm:table-cell">{c.invoiceCount}</td>
                    <td className="p-3 text-right text-slate-500 hidden sm:table-cell">
                      {c.oldestDueDate ? new Date(c.oldestDueDate).toLocaleDateString('es-DO') : '—'}
                    </td>
                    <td className="p-3 text-right font-semibold text-red-600">{formatCurrency(c.totalBalance)}</td>
                  </tr>
                ))}
                {!ar.clients.length && (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">Sin cuentas pendientes</td></tr>
                )}
              </tbody>
            </table>
          </ReportTableCard>
        </div>
      )}

      {!loading && !error && tab === 'sales' && sales && (
        <div className="space-y-4">
          <div className="executive-card p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="form-label flex items-center gap-1.5"><Calendar size={14} /> Desde</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="form-label flex items-center gap-1.5"><Calendar size={14} /> Hasta</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input text-sm" />
            </div>
            <button type="button" onClick={refreshSales} className="btn-primary text-sm">
              <Search size={14} /> Filtrar
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: TrendingUp, label: 'Total facturado', value: sales.totalFacturado, cls: 'text-blue-700', iconCls: 'text-blue-500' },
              { icon: CheckCircle, label: 'Total cobrado', value: sales.totalCobrado, cls: 'text-emerald-700', iconCls: 'text-emerald-500' },
              { icon: Wallet, label: 'Saldo pendiente', value: sales.totalPendiente, cls: 'text-red-600', iconCls: 'text-red-500' },
              { icon: Users, label: `Facturas (${sales.cantidadFacturas})`, value: sales.totalCredito + sales.totalContado, cls: 'text-slate-700', iconCls: 'text-slate-500' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="report-kpi">
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                    <Icon size={14} className={s.iconCls} /> {s.label}
                  </p>
                  <p className={`report-kpi-value ${s.cls}`}>{formatCurrency(s.value)}</p>
                </div>
              );
            })}
          </div>

          <ReportTableCard
            title="Principales clientes"
            actions={(
              <>
                {exportBtn(() => exportCsv('ventas-por-cliente', ['Cliente', 'Facturas', 'Total'], sales.topClients.map((c) => [c.clientName, c.count, c.total.toFixed(2)])))}
                {printBtn(() => printReportTable({
                  title: 'Resumen de ventas', companyName: company?.name,
                  subtitle: `${from || 'Inicio'} — ${to || 'Hoy'}`,
                  columns: ['Cliente', 'Facturas', 'Total'],
                  rows: sales.topClients.map((c) => [c.clientName, c.count, formatCurrency(c.total)]),
                  totalsRow: ['', 'Total facturado', formatCurrency(sales.totalFacturado)],
                }))}
              </>
            )}
          >
            <table className="w-full text-sm min-w-[320px]">
              <thead className="bg-slate-50 text-slate-500 border-b">
                <tr><th className="text-left p-3">Cliente</th><th className="text-right p-3">Facturas</th><th className="text-right p-3">Total</th></tr>
              </thead>
              <tbody>
                {sales.topClients.map((c) => (
                  <tr key={c.clientName} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="p-3 font-medium">{c.clientName}</td>
                    <td className="p-3 text-right">{c.count}</td>
                    <td className="p-3 text-right font-semibold text-blue-700">{formatCurrency(c.total)}</td>
                  </tr>
                ))}
                {!sales.topClients.length && (
                  <tr><td colSpan={3} className="p-8 text-center text-slate-500">Sin ventas en este período</td></tr>
                )}
              </tbody>
            </table>
          </ReportTableCard>
        </div>
      )}

      {!loading && !error && tab === 'inventory' && inventory && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="report-kpi">
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5"><Wallet size={14} className="text-blue-500" /> Valorización (costo)</p>
              <p className="report-kpi-value text-blue-700">{formatCurrency(inventory.totalValuacionCosto)}</p>
            </div>
            <div className="report-kpi">
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5"><TrendingUp size={14} className="text-emerald-500" /> Valorización (venta)</p>
              <p className="report-kpi-value text-emerald-700">{formatCurrency(inventory.totalValuacionVenta)}</p>
            </div>
            <div className="report-kpi">
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5"><AlertTriangle size={14} className="text-amber-500" /> Bajo stock mínimo</p>
              <p className="report-kpi-value text-amber-600 flex items-center gap-1.5">
                {inventory.lowStockCount > 0 && <AlertTriangle size={16} />} {inventory.lowStockCount}
              </p>
            </div>
          </div>

          <ReportTableCard
            title="Inventario disponible"
            actions={(
              <>
                {exportBtn(() => exportCsv('reporte-inventario', ['SKU', 'Producto', 'Disponible', 'Reservado', 'Mínimo', 'Valorización costo'],
                  inventory.products.map((p) => [p.sku, p.name, p.availableQty, p.reservedQty, p.minStock, p.valuacionCosto.toFixed(2)])))}
                {printBtn(() => printReportTable({
                  title: 'Reporte de inventario', companyName: company?.name,
                  subtitle: `Valorización total: ${formatCurrency(inventory.totalValuacionCosto)}`,
                  columns: ['SKU', 'Producto', 'Disponible', 'Mínimo', 'Valorización'],
                  rows: inventory.products.map((p) => [p.sku, p.name, p.availableQty, p.minStock, formatCurrency(p.valuacionCosto)]),
                  totalsRow: ['', '', '', 'Total', formatCurrency(inventory.totalValuacionCosto)],
                }))}
              </>
            )}
          >
            <table className="w-full text-sm min-w-[480px]">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-3">Producto</th>
                  <th className="text-right p-3">Disponible</th>
                  <th className="text-right p-3 hidden sm:table-cell">Reservado</th>
                  <th className="text-right p-3 hidden sm:table-cell">Mínimo</th>
                  <th className="text-right p-3">Valorización</th>
                </tr>
              </thead>
              <tbody>
                {inventory.products.map((p) => (
                  <tr key={p.productId} className={`border-b border-slate-100 ${p.bajoStock ? 'bg-amber-50/60' : 'hover:bg-slate-50/60'}`}>
                    <td className="p-3">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-slate-400 text-xs block">{p.sku}</span>
                    </td>
                    <td className={`p-3 text-right font-semibold ${p.bajoStock ? 'text-amber-700' : ''}`}>
                      {p.availableQty} {p.bajoStock && <AlertTriangle size={13} className="inline ml-1 -mt-0.5" />}
                    </td>
                    <td className="p-3 text-right text-slate-500 hidden sm:table-cell">{p.reservedQty}</td>
                    <td className="p-3 text-right text-slate-500 hidden sm:table-cell">{p.minStock}</td>
                    <td className="p-3 text-right">{formatCurrency(p.valuacionCosto)}</td>
                  </tr>
                ))}
                {!inventory.products.length && (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">Sin productos en inventario</td></tr>
                )}
              </tbody>
            </table>
          </ReportTableCard>
        </div>
      )}
    </DashboardLayout>
  );
}
