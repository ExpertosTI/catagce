'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Pencil, CheckCircle, FileText, ChevronDown, ChevronUp, Wallet, Search, Users, UserCheck, Clock, FileDown } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { ClientInvoicePanel } from '../../../components/ClientInvoicePanel';
import { EmptyState } from '../../../components/EmptyState';
import { ListPageSkeleton } from '../../../components/Skeleton';
import { useToast } from '../../../components/ToastProvider';
import { apiFetch } from '../../../lib/api';
import { clientStatusLabel } from '../../../lib/labels';
import { formatCurrency } from '../../../lib/currency';
import { PAGE } from '../../../lib/page-titles';
import { exportCsv } from '../../../lib/report-utils';
import { avatarGradient } from '../../../lib/avatar-colors';

type Client = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  creditLimit: string;
};

type StatusFilter = 'all' | 'active' | 'pending';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { showToast } = useToast();

  function load() {
    setLoading(true);
    apiFetch<Client[]>('/clients').then(setClients).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function approve(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await apiFetch(`/clients/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) });
    load();
  }

  function toggleClient(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const stats = useMemo(() => ({
    total: clients.length,
    active: clients.filter((c) => c.status === 'active').length,
    pending: clients.filter((c) => c.status === 'pending').length,
    creditTotal: clients.reduce((s, c) => s + parseFloat(c.creditLimit || '0'), 0),
  }), [clients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (statusFilter === 'active' && c.status !== 'active') return false;
      if (statusFilter === 'pending' && c.status !== 'pending') return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.phone?.includes(q);
    });
  }, [clients, query, statusFilter]);

  function exportClientsCsv() {
    exportCsv(
      'clientes',
      ['Código', 'Nombre', 'Email', 'Teléfono', 'Estado', 'Límite de crédito'],
      filtered.map((c) => [
        c.code ?? '',
        c.name,
        c.email ?? '',
        c.phone ?? '',
        clientStatusLabel[c.status] ?? c.status,
        parseFloat(c.creditLimit || '0').toFixed(2),
      ]),
    );
    showToast(`CSV exportado (${filtered.length} clientes)`);
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={PAGE.clients.title}
        subtitle="Toque un cliente para ver facturas y registrar pagos"
        action={(
          <Link href="/dashboard/clients/new" className="btn-primary text-sm">
            <Users size={16} /> Nuevo cliente
          </Link>
        )}
      />

      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Users size={14} /> Clientes</p>
            <p className="report-kpi-value text-slate-800">{stats.total}</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><UserCheck size={14} /> Activos</p>
            <p className="report-kpi-value text-emerald-700">{stats.active}</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Clock size={14} /> Pendientes</p>
            <p className="report-kpi-value text-amber-600">{stats.pending}</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Wallet size={14} /> Crédito total</p>
            <p className="report-kpi-value text-blue-700 text-lg">{formatCurrency(stats.creditTotal)}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input-search"
            placeholder="Buscar por nombre, código o teléfono..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="report-tabs !mb-0">
            {([['all', 'Todos'], ['active', 'Activos'], ['pending', 'Pendientes']] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setStatusFilter(id)}
                className={`report-tab ${statusFilter === id ? 'report-tab-active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportClientsCsv}
            disabled={!filtered.length}
            className="report-toolbar-btn disabled:opacity-40"
          >
            <FileDown size={14} /> CSV
          </button>
        </div>
      </div>

      {loading && <ListPageSkeleton />}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={Users}
          title="Sin clientes"
          subtitle="Cree un cliente para comenzar"
          action={{ href: '/dashboard/clients/new', label: 'Nuevo cliente' }}
        />
      )}

      <div className="space-y-3">
        {filtered.map((c) => {
          const expanded = expandedId === c.id;
          return (
            <article
              key={c.id}
              className={`executive-card transition-all cursor-pointer ${expanded ? 'ring-2 ring-blue-300/60 shadow-md' : 'hover:shadow-md'}`}
              onClick={() => toggleClient(c.id)}
              onKeyDown={(e) => e.key === 'Enter' && toggleClient(c.id)}
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGradient(c.name)} text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-sm`}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{c.code}</p>
                    <p className="text-sm text-slate-600 truncate">{c.phone || c.email}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold ${c.status === 'active' ? 'badge-green' : c.status === 'pending' ? 'badge-amber' : 'badge-blue'}`}>
                    {clientStatusLabel[c.status] ?? c.status}
                  </span>
                  {expanded ? <ChevronUp size={18} className="text-blue-600" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </div>

              <p className="text-sm text-slate-600 mt-3">
                Crédito: <strong className="tabular-nums text-blue-700">{formatCurrency(c.creditLimit)}</strong>
              </p>

              <p className="text-xs text-blue-600 font-semibold mt-2 flex items-center gap-1">
                <Wallet size={14} />
                {expanded ? 'Ocultar facturas' : 'Toque para ver facturas y pagar'}
              </p>

              <ClientInvoicePanel clientId={c.id} clientName={c.name} expanded={expanded} />

              <div className="flex flex-wrap gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                {c.status === 'pending' && (
                  <button type="button" onClick={(e) => approve(c.id, e)} className="action-chip action-chip-success text-xs">
                    <CheckCircle size={15} /> <span className="!inline">Aprobar</span>
                  </button>
                )}
                <button type="button" onClick={() => toggleClient(c.id)} className="action-chip action-chip-success text-xs">
                  <FileText size={15} /> <span className="!inline">{expanded ? 'Cerrar' : 'Facturas'}</span>
                </button>
                <Link href={`/dashboard/clients/${c.id}`} className="action-chip text-xs">
                  <span className="!inline">Perfil</span>
                </Link>
                <Link href={`/dashboard/clients/${c.id}?tab=edit`} className="action-chip text-xs ml-auto">
                  <Pencil size={15} /> <span className="!inline">Editar</span>
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
