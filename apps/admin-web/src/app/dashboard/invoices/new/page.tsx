'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { QuickClientModal } from '../../../../components/QuickClientModal';
import { SegmentedControl } from '../../../../components/SegmentedControl';
import { ProductPicker, PickedLine, PickerProduct } from '../../../../components/ProductPicker';
import { apiFetch } from '../../../../lib/api';
import { formatCurrency } from '../../../../lib/currency';

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [clientId, setClientId] = useState('');
  const [invoiceType, setInvoiceType] = useState<'cash' | 'credit'>('credit');
  const [lines, setLines] = useState<PickedLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);

  function loadClients() {
    return apiFetch<any[]>('/clients').then((c) => {
      const active = c.filter((x) => x.status === 'active');
      setClients(active);
      if (active.length && !active.some((x) => x.id === clientId)) {
        setClientId(active[0].id);
      }
      return active;
    });
  }

  useEffect(() => {
    Promise.all([loadClients(), apiFetch<PickerProduct[]>('/products')]).then(([, p]) => setProducts(p));
  }, []);

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.length) {
      alert('Agregue al menos un producto');
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
      alert(err instanceof Error ? err.message : 'Error al emitir factura');
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
            <div className="flex gap-2">
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="input flex-1" required>
                {clients.length === 0 && <option value="">Sin clientes activos</option>}
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
              <button type="button" onClick={() => setShowClientModal(true)} className="btn-secondary shrink-0 px-3" title="Crear cliente">
                <UserPlus size={18} />
              </button>
            </div>
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
          <ProductPicker products={products} lines={lines} onChange={setLines} />
        </div>

        <div className="invoice-summary-footer">
          <div className="flex justify-between font-bold text-lg">
            <span>Total factura</span>
            <span className="text-blue-700">{formatCurrency(total)}</span>
          </div>
        </div>

        <button type="submit" disabled={loading || !clientId} className="btn-primary w-full sm:w-auto disabled:opacity-50">
          {loading ? 'Emitiendo...' : 'Emitir factura'}
        </button>
      </form>

      <QuickClientModal
        open={showClientModal}
        onClose={() => setShowClientModal(false)}
        onCreated={async (client) => {
          await loadClients();
          setClientId(client.id);
        }}
      />
    </DashboardLayout>
  );
}
