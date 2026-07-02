'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { EmptyState } from '../../../../components/EmptyState';
import { LoadingState } from '../../../../components/LoadingState';
import { FormField } from '../../../../components/FormField';
import { ClientPicker, PickerClient } from '../../../../components/ClientPicker';
import { QuantityStepper } from '../../../../components/QuantityStepper';
import { apiFetch } from '../../../../lib/api';
import { PAGE } from '../../../../lib/page-titles';

export default function NewDispatchPage() {
  const router = useRouter();
  const [pending, setPending] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<any[]>('/invoices/pending-dispatch')
      .then(setPending)
      .catch(() => setError('No se pudo cargar la mercancía pendiente de despacho'))
      .finally(() => setFetching(false));
  }, []);

  const byClient = pending.reduce((acc: Record<string, any[]>, item) => {
    if (!acc[item.clientId]) acc[item.clientId] = [];
    acc[item.clientId].push(item);
    return acc;
  }, {});

  const clientOptions: PickerClient[] = useMemo(
    () => Object.keys(byClient).map((cid) => ({ id: cid, name: byClient[cid][0].clientName })),
    [pending],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const items = Object.entries(selected)
      .filter(([, qty]) => qty > 0)
      .map(([invoiceItemId, quantity]) => ({ invoiceItemId, quantity }));
    if (!items.length) {
      setError('Seleccione cantidades a despachar');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/invoices/dispatches', {
        method: 'POST',
        body: JSON.stringify({ clientId, items }),
      });
      router.push('/dashboard/dispatches');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar despacho');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader emoji={PAGE.dispatchesNew.emoji} title={PAGE.dispatchesNew.title} subtitle={PAGE.dispatchesNew.subtitle} />

      {fetching ? (
        <LoadingState emoji="🚚" message="Cargando mercancía pendiente..." />
      ) : !clientOptions.length ? (
        <EmptyState emoji="✅" title="Sin pendientes de despacho" subtitle="Toda la mercancía facturada ya fue entregada" />
      ) : (
        <form onSubmit={submit} className="form-card max-w-2xl space-y-4">
          <FormField label="👤 Cliente">
            <ClientPicker
              clients={clientOptions}
              value={clientId}
              onChange={(id) => { setClientId(id); setSelected({}); }}
              allowCreate={false}
              emptyMessage="Sin clientes con pendientes"
            />
          </FormField>

          {clientId && byClient[clientId]?.map((item) => (
            <div key={item.id} className="executive-card !p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">📦 {item.productName}</p>
                <p className="text-sm text-slate-500">Pendiente: <strong className="text-amber-700">{item.pendingQty}</strong></p>
              </div>
              <QuantityStepper
                value={selected[item.invoiceItemId] || 0}
                onChange={(q) => setSelected({ ...selected, [item.invoiceItemId]: Math.min(q, item.pendingQty) })}
                min={0}
                max={item.pendingQty}
                size="sm"
              />
            </div>
          ))}

          {error && <p className="text-sm text-red-600">❌ {error}</p>}

          <button type="submit" disabled={loading || !clientId} className="btn-primary disabled:opacity-50">
            {loading ? '⏳ Registrando...' : '🚚 Confirmar despacho'}
          </button>
        </form>
      )}
    </DashboardLayout>
  );
}
