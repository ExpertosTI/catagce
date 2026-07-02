'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { ClientPicker, PickerClient } from '../../../../components/ClientPicker';
import { SegmentedControl } from '../../../../components/SegmentedControl';
import { ProductPicker, PickedLine, PickerProduct } from '../../../../components/ProductPicker';
import { apiFetch } from '../../../../lib/api';
import { formatCurrency } from '../../../../lib/currency';

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<PickerClient[]>([]);
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [clientId, setClientId] = useState('');
  const [invoiceType, setInvoiceType] = useState<'cash' | 'credit'>('credit');
  const [lines, setLines] = useState<PickedLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<any[]>('/clients').then((c) => {
      const active = c.filter((x) => x.status === 'active');
      setClients(active);
      if (active.length) setClientId((prev) => prev || active[0].id);
    }).catch(() => setError('No se pudieron cargar los clientes'));
    apiFetch<PickerProduct[]>('/products').then(setProducts).catch(() => setError('No se pudieron cargar los productos'));
  }, []);

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!clientId) {
      setError('Seleccione o cree un cliente');
      return;
    }
    if (!lines.length) {
      setError('Agregue al menos un producto');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          invoiceType,
          issue: true,
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
          })),
        }),
      });
      router.push('/dashboard/invoices');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al emitir factura');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title="Nueva factura" subtitle="Emitir factura al contado o a crédito" />

      <form onSubmit={submit} className="form-card max-w-2xl space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Cliente">
            <ClientPicker
              clients={clients}
              value={clientId}
              onChange={setClientId}
              onCreated={(client) => setClients((prev) => [...prev, client])}
              emptyMessage="Sin clientes activos"
            />
          </FormField>
          <FormField label="Tipo de factura">
            <SegmentedControl<'cash' | 'credit'>
              value={invoiceType}
              onChange={setInvoiceType}
              options={[
                { value: 'credit', label: 'Crédito' },
                { value: 'cash', label: 'Contado' },
              ]}
            />
          </FormField>
        </div>

        <div>
          <p className="form-label">Productos</p>
          <ProductPicker products={products} lines={lines} onChange={setLines} emptyMessage="Busque y agregue productos a la factura" />
        </div>

        <div className="invoice-summary-footer">
          <div className="flex justify-between font-bold text-lg">
            <span>Total factura</span>
            <span className="text-blue-700">{formatCurrency(total)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading || !clientId} className="btn-primary w-full sm:w-auto disabled:opacity-50">
          {loading ? 'Emitiendo...' : 'Emitir factura'}
        </button>
      </form>
    </DashboardLayout>
  );
}
