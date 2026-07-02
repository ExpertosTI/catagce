'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles, RefreshCw, TrendingUp, Wallet, Truck, Package,
  FileText, Users, AlertCircle, ArrowRight, Zap,
} from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../components/DashboardLayout';
import { LoadingState } from '../../components/LoadingState';
import { apiFetch } from '../../lib/api';
import { formatCurrency } from '../../lib/currency';
import { invoiceStatusText, importStatusLabel } from '../../lib/labels';
import { PAGE } from '../../lib/page-titles';
import { useCompany } from '../../lib/useCompany';
import type { DashboardSummary } from '../../lib/dashboard-types';

const POLL_MS = 30_000;

const QUICK_ACTIONS = [
  { href: '/dashboard/invoices/new', emoji: '📝', label: 'Nueva factura', color: 'from-blue-600 to-indigo-700' },
  { href: '/dashboard/payments', emoji: '💰', label: 'Registrar pago', color: 'from-emerald-600 to-teal-700' },
  { href: '/dashboard/dispatches/new', emoji: '🚚', label: 'Despacho', color: 'from-orange-500 to-amber-600' },
  { href: '/dashboard/products/new', emoji: '📦', label: 'Nuevo producto', color: 'from-violet-600 to-purple-700' },
];

function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full ring-1 ring-emerald-200">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      En vivo
    </span>
  );
}

function KpiHero({ label, value, sub, icon: Icon, gradient }: {
  label: string; value: string; sub?: string; icon: typeof TrendingUp; gradient: string;
}) {
  return (
    <div className={`dashboard-hero-card bg-gradient-to-br ${gradient} text-white`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-90">{label}</p>
          <p className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight tabular-nums">{value}</p>
          {sub && <p className="text-xs opacity-80 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const company = useCompany();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const summary = await apiFetch<DashboardSummary>('/dashboard/summary');
      setData(summary);
      setLastUpdate(new Date());
    } catch {
      if (!silent) window.location.href = '/login';
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!data || aiBrief) return;
    setAiLoading(true);
    apiFetch<{ reply: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Dame un resumen ejecutivo del negocio hoy en máximo 2 oraciones, con los datos más urgentes o positivos.',
        history: [],
      }),
    })
      .then((r) => setAiBrief(r.reply))
      .catch(() => setAiBrief(null))
      .finally(() => setAiLoading(false));
  }, [data, aiBrief]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingState emoji="🏠" message="Cargando panel..." />
      </DashboardLayout>
    );
  }

  const insights = data?.insights ?? [];
  const displayInsights = aiBrief
    ? [{ type: 'ai' as const, text: aiBrief }, ...insights.slice(0, 3)]
    : insights;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 -mb-2">
        <div>
          <p className="text-sm text-slate-500 mb-1">{greeting} 👋</p>
          <PageHeader
            emoji={PAGE.dashboard.emoji}
            title={PAGE.dashboard.title}
            subtitle={PAGE.dashboard.subtitle}
            action={
              <div className="flex items-center gap-2 shrink-0">
                <LiveDot />
                <button
                  type="button"
                  onClick={() => load()}
                  disabled={refreshing}
                  className="btn-subtle text-xs"
                  title="Actualizar ahora"
                >
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                  {lastUpdate ? lastUpdate.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </button>
              </div>
            }
          />
        </div>
      </div>

      {/* Super AI briefing */}
      <div className="dashboard-ai-panel mb-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30">
            <Sparkles size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 flex items-center gap-2">
              Super AI
              <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">Análisis</span>
            </p>
            {aiLoading ? (
              <p className="text-sm text-slate-500 mt-1 animate-pulse">Analizando datos en tiempo real...</p>
            ) : (
              <div className="mt-2 space-y-2">
                {displayInsights.map((ins, i) => (
                  <div
                    key={i}
                    className={`dashboard-insight dashboard-insight-${ins.type}`}
                  >
                    {ins.type === 'ai' && <Zap size={14} className="shrink-0 text-violet-600" />}
                    {ins.type === 'warning' && <AlertCircle size={14} className="shrink-0 text-amber-600" />}
                    {ins.type === 'success' && <TrendingUp size={14} className="shrink-0 text-emerald-600" />}
                    {ins.type === 'info' && <Package size={14} className="shrink-0 text-blue-600" />}
                    <span>{ins.text}</span>
                  </div>
                ))}
                {!company?.settings?.hasGeminiKey && !aiLoading && (
                  <Link href="/dashboard/settings" className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 px-3 py-2 rounded-xl hover:bg-violet-100 transition mt-1">
                    <Sparkles size={13} /> Configurar API de Google en Ajustes
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiHero
          label="Ventas del mes"
          value={formatCurrency(data?.salesMonth?.total ?? 0)}
          sub={`${data?.salesMonth?.count ?? 0} facturas`}
          icon={TrendingUp}
          gradient="from-blue-600 to-blue-800"
        />
        <KpiHero
          label="Cobrado hoy"
          value={formatCurrency(data?.paymentsToday?.total ?? 0)}
          sub={`${data?.paymentsToday?.count ?? 0} pagos`}
          icon={Wallet}
          gradient="from-emerald-600 to-teal-700"
        />
        <KpiHero
          label="Por cobrar"
          value={formatCurrency(data?.invoices?.creditPending ?? 0)}
          sub={`${data?.invoices?.openCount ?? 0} abiertas`}
          icon={FileText}
          gradient="from-amber-500 to-orange-600"
        />
        <KpiHero
          label="Vencidas"
          value={String(data?.overdue?.count ?? 0)}
          sub={data?.overdue?.count ? formatCurrency(data.overdue.total ?? 0) : 'Sin vencidas'}
          icon={AlertCircle}
          gradient="from-red-500 to-rose-600"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className={`dashboard-quick-action bg-gradient-to-br ${a.color}`}>
            <span className="text-xl" aria-hidden>{a.emoji}</span>
            <span className="text-sm font-semibold">{a.label}</span>
            <ArrowRight size={14} className="ml-auto opacity-70" />
          </Link>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {[
          { emoji: '🧾', label: 'Facturas emitidas', value: data?.invoices?.total ?? '—', color: 'text-blue-700' },
          { emoji: '🚚', label: 'Despachos pendientes', value: data?.pendingDispatch?.count ?? '—', color: 'text-orange-700' },
          { emoji: '📦', label: 'Unidades por despachar', value: data?.pendingDispatch?.units ?? '—', color: 'text-orange-700' },
          { emoji: '🏭', label: 'En almacén', value: data?.stock?.inWarehouse ?? '—', color: 'text-emerald-700' },
          { emoji: '🔒', label: 'Reservadas', value: data?.stock?.reserved ?? '—', color: 'text-slate-700' },
          { emoji: '👥', label: 'Clientes activos', value: data?.activeClients ?? '—', color: 'text-blue-700' },
        ].map((card) => (
          <div key={card.label} className="dashboard-stat-tile">
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <span aria-hidden>{card.emoji}</span> {card.label}
            </p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent payments */}
        <div className="dashboard-feed-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Wallet size={16} className="text-emerald-600" /> Pagos recientes</h3>
            <Link href="/dashboard/payments" className="text-xs text-blue-700 font-medium hover:underline">Ver todos</Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {(data?.recentPayments ?? []).length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-slate-400">Sin pagos recientes</li>
            )}
            {(data?.recentPayments ?? []).map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.clientName}</p>
                  <p className="text-xs text-slate-400">{p.invoiceReference}</p>
                </div>
                <span className="font-bold text-emerald-700 shrink-0">{formatCurrency(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent invoices */}
        <div className="dashboard-feed-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-sm flex items-center gap-2"><FileText size={16} className="text-blue-600" /> Facturas recientes</h3>
            <Link href="/dashboard/invoices" className="text-xs text-blue-700 font-medium hover:underline">Ver todas</Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {(data?.recentInvoices ?? []).length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-slate-400">Sin facturas recientes</li>
            )}
            {(data?.recentInvoices ?? []).map((inv) => (
              <li key={inv.id}>
                <Link href={`/dashboard/invoices/${inv.id}`} className="px-4 py-3 flex items-center justify-between gap-2 text-sm hover:bg-slate-50/80 transition">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{inv.ncf ?? inv.reference}</p>
                    <p className="text-xs text-slate-400">{inv.clientName} · {invoiceStatusText(inv.status)}</p>
                  </div>
                  <span className="font-bold text-slate-800 shrink-0">{formatCurrency(inv.totalAmount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {(data?.recentImports ?? []).length > 0 && (
        <div className="dashboard-feed-card mt-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Truck size={16} className="text-slate-600" /> Importaciones</h3>
            <Link href="/dashboard/imports" className="text-xs text-blue-700 font-medium hover:underline">Ver todas</Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {(data?.recentImports ?? []).map((imp) => (
              <li key={imp.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <span className="font-medium">{imp.reference}</span>
                <span className="badge-blue text-[10px]">{importStatusLabel[imp.status] ?? imp.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardLayout>
  );
}
