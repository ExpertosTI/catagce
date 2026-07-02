'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil, CheckCircle, FileText, ChevronDown, ChevronUp, Wallet } from 'lucide-react';
import DashboardLayout, { PageHeader, ActionButton } from '../../../components/DashboardLayout';
import { ClientInvoicePanel } from '../../../components/ClientInvoicePanel';
import { EmptyState } from '../../../components/EmptyState';
import { LoadingState } from '../../../components/LoadingState';
import { apiFetch } from '../../../lib/api';
import { clientStatusLabel, formatMoney } from '../../../lib/labels';
import { PAGE } from '../../../lib/page-titles';

type Client = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  creditLimit: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const filtered = clients.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  return (
    <DashboardLayout>
      <PageHeader
        emoji={PAGE.clients.emoji}
        title={PAGE.clients.title}
        subtitle="Toque un cliente para ver sus facturas y registrar pagos"
        action={<ActionButton href="/dashboard/clients/new" emoji="✨" label="Nuevo cliente" />}
      />

      <div className="relative max-w-xl mb-5">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg" aria-hidden>🔍</span>
        <input
          className="input-search !pl-11"
          placeholder="Buscar por nombre, código o teléfono..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <LoadingState emoji="👥" message="Cargando clientes..." />}

      {!loading && filtered.length === 0 && (
        <EmptyState
          emoji="👥"
          title="Sin clientes"
          subtitle="Cree un cliente para comenzar"
          action={{ href: '/dashboard/clients/new', label: '✨ Nuevo cliente' }}
        />
      )}

      <div className="space-y-3">
        {filtered.map((c) => {
          const expanded = expandedId === c.id;
          return (
            <article
              key={c.id}
              className={`executive-card transition-all cursor-pointer ${expanded ? 'ring-2 ring-blue-200 border-blue-200' : 'hover:border-blue-200 hover:shadow-md'}`}
              onClick={() => toggleClient(c.id)}
              onKeyDown={(e) => e.key === 'Enter' && toggleClient(c.id)}
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-bold shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.code}</p>
                    <p className="text-sm text-slate-600 truncate">{c.phone || c.email}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-[10px] ${c.status === 'active' ? 'badge-green' : c.status === 'pending' ? 'badge-amber' : 'badge-blue'}`}>
                    {clientStatusLabel[c.status] ?? c.status}
                  </span>
                  {expanded ? <ChevronUp size={18} className="text-blue-600" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </div>

              <p className="text-sm text-slate-600 mt-3">💳 Crédito: <strong>{formatMoney(c.creditLimit)}</strong></p>

              <p className="text-xs text-blue-600 font-medium mt-2 flex items-center gap-1">
                <Wallet size={14} />
                {expanded ? 'Ocultar facturas' : 'Toque para ver facturas y pagar'}
              </p>

              <ClientInvoicePanel clientId={c.id} clientName={c.name} expanded={expanded} />

              <div className="action-bar mt-3 !p-2" onClick={(e) => e.stopPropagation()}>
                {c.status === 'pending' && (
                  <button type="button" onClick={(e) => approve(c.id, e)} className="btn-subtle btn-subtle-success text-xs">
                    <CheckCircle size={14} /> Aprobar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleClient(c.id)}
                  className="btn-subtle btn-subtle-primary text-xs"
                >
                  <FileText size={14} /> {expanded ? 'Cerrar' : 'Facturas'}
                </button>
                <Link href={`/dashboard/clients/${c.id}`} className="btn-subtle text-xs">
                  Perfil
                </Link>
                <Link href={`/dashboard/clients/${c.id}?tab=edit`} className="btn-subtle text-xs ml-auto">
                  <Pencil size={14} /> Editar
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
