'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil, CheckCircle } from 'lucide-react';
import DashboardLayout, { PageHeader, ActionButton } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';
import { clientStatusLabel, formatMoney } from '../../../lib/labels';

type Client = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  creditLimit: string;
};

function ClientRow({ client, onApprove }: { client: Client; onApprove: (id: string) => void }) {
  return (
    <div className="client-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 font-medium">{client.code}</p>
          <p className="font-bold text-slate-900 truncate">{client.name}</p>
          <p className="text-sm text-slate-600 truncate">{client.email}</p>
          {client.phone && <p className="text-sm text-slate-500">{client.phone}</p>}
        </div>
        <span className={`shrink-0 ${client.status === 'active' ? 'badge-green' : client.status === 'pending' ? 'badge-amber' : 'badge-blue'}`}>
          {clientStatusLabel[client.status] ?? client.status}
        </span>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <span className="text-sm text-slate-600">Crédito: <strong>{formatMoney(client.creditLimit)}</strong></span>
        <div className="flex gap-2">
          {client.status === 'pending' && (
            <button type="button" onClick={() => onApprove(client.id)} className="btn-action btn-action-primary text-xs">
              <CheckCircle size={14} /> Aprobar
            </button>
          )}
          <Link href={`/dashboard/clients/${client.id}`} className="btn-action btn-action-secondary text-xs">
            <Pencil size={14} /> Editar
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<Client[]>('/clients')
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    await apiFetch(`/clients/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) });
    load();
  }

  return (
    <DashboardLayout>
      <PageHeader title="Clientes" subtitle="Gestión y aprobación de registros" action={<ActionButton href="/dashboard/clients/new" label="Nuevo cliente" />} />

      {loading && <p className="text-center text-slate-500 py-12">Cargando clientes...</p>}

      {!loading && clients.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p className="font-medium">Sin clientes</p>
          <p className="text-sm mt-1">Cree un cliente para comenzar</p>
        </div>
      )}

      <div className="md:hidden space-y-3">
        {clients.map((c) => <ClientRow key={c.id} client={c} onApprove={approve} />)}
      </div>

      <div className="hidden md:block card overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 text-slate-500 border-b">
            <tr>
              <th className="text-left p-4">Código</th>
              <th className="text-left p-4">Nombre</th>
              <th className="text-left p-4">Correo</th>
              <th className="text-left p-4">Estado</th>
              <th className="text-right p-4">Crédito</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-medium">{c.code}</td>
                <td className="p-4">{c.name}</td>
                <td className="p-4">{c.email}</td>
                <td className="p-4">
                  <span className={c.status === 'active' ? 'badge-green' : c.status === 'pending' ? 'badge-amber' : 'badge-blue'}>
                    {clientStatusLabel[c.status] ?? c.status}
                  </span>
                </td>
                <td className="p-4 text-right">{formatMoney(c.creditLimit)}</td>
                <td className="p-4 text-right space-x-2">
                  {c.status === 'pending' && (
                    <button type="button" onClick={() => approve(c.id)} className="text-sm text-teal-700 font-semibold hover:underline">Aprobar</button>
                  )}
                  <Link href={`/dashboard/clients/${c.id}`} className="text-sm text-blue-700 font-semibold hover:underline">Editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
