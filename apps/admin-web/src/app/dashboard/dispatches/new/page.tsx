'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { apiFetch } from '../../../../lib/api';

export default function NewDispatchPage() {
  const router = useRouter();
  const [pending, setPending] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<any[]>('/invoices/pending-dispatch').then(setPending);
  }, []);

  const byClient = pending.reduce((acc: Record<string, any[]>, item) => {
    if (!acc[item.clientId]) acc[item.clientId] = [];
    acc[item.clientId].push(item);
    return acc;
  }, {});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const items = Object.entries(selected)
      .filter(([, qty]) => qty > 0)
      .map(([invoiceItemId, quantity]) => ({ invoiceItemId, quantity }));
    if (!items.length) return alert('Seleccione cantidades a despachar');
    setLoading(true);
    try {
      await apiFetch('/invoices/dispatches', {
        method: 'POST',
        body: JSON.stringify({ clientId, items }),
      });
      router.push('/dashboard/dispatches');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title="Registrar despacho" subtitle="Entrega parcial de mercancía al cliente" />
      <form onSubmit={submit} className="card p-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Cliente</label>
          <select value={clientId} onChange={(e) => { setClientId(e.target.value); setSelected({}); }} className="input mt-1" required>
            <option value="">Seleccionar</option>
            {Object.keys(byClient).map((cid) => (
              <option key={cid} value={cid}>{byClient[cid][0].clientName}</option>
            ))}
          </select>
        </div>
        {clientId && byClient[clientId]?.map((item) => (
          <div key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <p className="font-medium">{item.productName}</p>
              <p className="text-sm text-slate-500">Pendiente: {item.pendingQty}</p>
            </div>
            <input
              type="number" min={0} max={item.pendingQty}
              value={selected[item.invoiceItemId] || ''}
              onChange={(e) => setSelected({ ...selected, [item.invoiceItemId]: Number(e.target.value) })}
              className="input w-24" placeholder="Cant."
            />
          </div>
        ))}
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? 'Registrando...' : 'Confirmar despacho'}
        </button>
      </form>
    </DashboardLayout>
  );
}
