'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Package, Truck, CheckCircle } from 'lucide-react';
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

  const selectedUnits = Object.values(selected).reduce((s, q) => s + q, 0);

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
      <Link href="/dashboard/dispatches" className="text-blue-700 text-sm font-semibold hover:underline inline-flex items-center gap-1.5 mb-4">
        <ArrowLeft size={16} /> Volver a despachos
      </Link>

      {fetching ? (
        <LoadingState message="Cargando mercancía pendiente..." />
      ) : !clientOptions.length ? (
        <EmptyState icon={CheckCircle} title="Sin pendientes de despacho" subtitle="Toda la mercancía facturada ya fue entregada" />
      ) : (
        <form onSubmit={submit} className="form-card max-w-2xl space-y-5">
          <FormField label="Cliente">
            <ClientPicker
              clients={clientOptions}
              value={clientId}
              onChange={(id) => { setClientId(id); setSelected({}); }}
              allowCreate={false}
              emptyMessage="Sin clientes con pendientes"
            />
          </FormField>

          {clientId && (
            <>
              {selectedUnits > 0 && (
                <div className="report-kpi border-blue-200/80 bg-gradient-to-br from-blue-50/80 to-white">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Unidades a despachar</p>
                  <p className="report-kpi-value text-blue-700">{selectedUnits}</p>
                </div>
              )}

              <div className="space-y-2">
                {byClient[clientId]?.map((item) => (
                  <div key={item.id} className="line-item-card flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <Package size={18} className="text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{item.productName}</p>
                        <p className="text-sm text-slate-500">
                          Pendiente: <strong className="text-amber-700 tabular-nums">{item.pendingQty}</strong>
                        </p>
                      </div>
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
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => router.back()} className="btn-secondary flex-1 sm:flex-none sm:min-w-[120px]">Cancelar</button>
            <button type="submit" disabled={loading || !clientId || selectedUnits === 0} className="btn-primary flex-1 disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
              {loading ? 'Registrando...' : 'Confirmar despacho'}
            </button>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
}
