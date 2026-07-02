'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil, CheckCircle, UserPlus } from 'lucide-react';
import DashboardLayout, { PageHeader, ActionButton } from '../../../components/DashboardLayout';
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

  function load() {
    setLoading(true);
    apiFetch<Client[]>('/clients').then(setClients).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function approve(id: string) {
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

      {loading && <p className="text-center text-slate-400 py-12">👥 Cargando clientes...</p>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3" aria-hidden>👥</p>
          <p className="font-medium">Sin clientes</p>
          <p className="text-sm mt-1">Cree un cliente para comenzar</p>
          <Link href="/dashboard/clients/new" className="btn-subtle btn-subtle-primary mt-4 inline-flex">
            <UserPlus size={15} /> Nuevo cliente
          </Link>
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((c) => (
          <article key={c.id} className="executive-card">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-lg font-bold shrink-0">
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
            <div className="action-bar mt-3 !p-2">
              {c.status === 'pending' && (
                <button type="button" onClick={() => approve(c.id)} className="btn-subtle btn-subtle-success text-xs">
                  <CheckCircle size={14} /> Aprobar
                </button>
              )}
              <Link href={`/dashboard/clients/${c.id}`} className="btn-subtle btn-subtle-primary text-xs ml-auto">
                <Pencil size={14} /> Editar
              </Link>
            </div>
          </article>
        ))}
      </div>
    </DashboardLayout>
  );
}
