'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, CheckCircle, FileText, ChevronRight } from 'lucide-react';
import DashboardLayout, { PageHeader, ActionButton } from '../../../components/DashboardLayout';
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
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

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
        subtitle={PAGE.clients.subtitle}
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

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((c) => (
          <article
            key={c.id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/dashboard/clients/${c.id}`)}
            onKeyDown={(e) => e.key === 'Enter' && router.push(`/dashboard/clients/${c.id}`)}
            className="executive-card cursor-pointer hover:border-blue-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-bold shrink-0 group-hover:bg-blue-100 transition">
                  {c.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.code}</p>
                  <p className="text-sm text-slate-600 truncate">{c.phone || c.email}</p>
                </div>
              </div>
              <span className={`shrink-0 text-[10px] ${c.status === 'active' ? 'badge-green' : c.status === 'pending' ? 'badge-amber' : 'badge-blue'}`}>
                {clientStatusLabel[c.status] ?? c.status}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-3">💳 Crédito: <strong>{formatMoney(c.creditLimit)}</strong></p>
            <div className="action-bar mt-3 !p-2" onClick={(e) => e.stopPropagation()}>
              {c.status === 'pending' && (
                <button type="button" onClick={(e) => approve(c.id, e)} className="btn-subtle btn-subtle-success text-xs">
                  <CheckCircle size={14} /> Aprobar
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                className="btn-subtle btn-subtle-primary text-xs"
              >
                <FileText size={14} /> Ver facturas
              </button>
              <Link href={`/dashboard/clients/${c.id}?tab=edit`} className="btn-subtle text-xs ml-auto">
                <Pencil size={14} /> Editar
              </Link>
              <ChevronRight size={16} className="text-slate-300 ml-1 hidden sm:block" />
            </div>
          </article>
        ))}
      </div>
    </DashboardLayout>
  );
}
