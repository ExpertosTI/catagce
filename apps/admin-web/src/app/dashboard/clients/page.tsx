'use client';

import { useEffect, useState } from 'react';
import DashboardLayout, { PageHeader, ActionButton } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);

  function load() {
    apiFetch<any[]>('/clients').then(setClients).catch(console.error);
  }

  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    await apiFetch(`/clients/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) });
    load();
  }

  return (
    <DashboardLayout>
      <PageHeader title="Clientes" subtitle="Gestión y aprobación de registros" action={<ActionButton href="/dashboard/clients/new" label="Nuevo cliente" />} />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b">
            <tr>
              <th className="text-left p-4">Código</th>
              <th className="text-left p-4">Nombre</th>
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Estado</th>
              <th className="text-right p-4">Crédito</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-slate-100">
                <td className="p-4">{c.code}</td>
                <td className="p-4">{c.name}</td>
                <td className="p-4">{c.email}</td>
                <td className="p-4">
                  <span className={`capitalize ${c.status === 'active' ? 'badge-green' : c.status === 'pending' ? 'badge-amber' : 'badge-blue'}`}>{c.status}</span>
                </td>
                <td className="p-4 text-right">${parseFloat(c.creditLimit || '0').toFixed(2)}</td>
                <td className="p-4 text-right">
                  {c.status === 'pending' && (
                    <button onClick={() => approve(c.id)} className="text-sm text-blue-700 hover:underline">Aprobar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
