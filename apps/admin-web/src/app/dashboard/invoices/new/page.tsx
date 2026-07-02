'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { ClientPicker, PickerClient } from '../../../../components/ClientPicker';
import { SegmentedControl } from '../../../../components/SegmentedControl';
import { ProductPicker, PickedLine, PickerProduct } from '../../../../components/ProductPicker';
import { apiFetch } from '../../../../lib/api';
import { formatCurrency } from '../../../../lib/currency';
import { SALE_COMPROBANTE_OPTIONS, comprobanteTypeLabel } from '../../../../lib/labels';

const ITBIS_RATE = 18;

function suggestComprobante(client?: PickerClient, invoiceType?: 'cash' | 'credit') {
  if (client?.taxId?.trim()) return 'B01';
  return invoiceType === 'credit' ? 'B01' : 'B02';
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<PickerClient[]>([]);
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [clientId, setClientId] = useState('');
  const [invoiceType, setInvoiceType] = useState<'cash' | 'credit'>('credit');
  const [comprobanteType, setComprobanteType] = useState('B01');
  const [lines, setLines] = useState<PickedLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedClient = clients.find((c) => c.id === clientId);

  useEffect(() => {
    apiFetch<any[]>('/clients').then((c) => {
      const active = c
        .filter((x) => x.status === 'active')
        .map((x) => ({ id: x.id, name: x.name, code: x.code, email: x.email, phone: x.phone, taxId: x.taxId }));
      setClients(active);
    }).catch(() => setError('No se pudieron cargar los clientes'));
    apiFetch<PickerProduct[]>('/products').then(setProducts).catch(() => setError('No se pudieron cargar los productos'));
  }, []);

  useEffect(() => {
    setComprobanteType(suggestComprobante(selectedClient, invoiceType));
  }, [clientId, invoiceType, selectedClient?.taxId]);

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const itbis = useMemo(() => Math.round(subtotal * (ITBIS_RATE / 100) * 100) / 100, [subtotal]);
  const total = subtotal + itbis;

  const comprobanteWarning = comprobanteType === 'B01' && !selectedClient?.taxId?.trim()
    ? 'La factura de crédito fiscal (B01) requiere RNC o cédula del cliente.'
    : null;

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
    if (comprobanteWarning) {
      setError(comprobanteWarning);
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          invoiceType,
          comprobanteType,
          itbisRate: ITBIS_RATE,
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
      <PageHeader title="Nueva factura" subtitle="Comprobante fiscal DGII con NCF e ITBIS" />

      <form onSubmit={submit} className="form-card max-w-2xl space-y-5">
        <FormField label="Cliente">
          <ClientPicker
            clients={clients}
            value={clientId}
            onChange={setClientId}
            onCreated={(client) => setClients((prev) => [...prev, client])}
            emptyMessage="Busque o cree un cliente para facturar"
          />
        </FormField>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Condición de pago">
            <SegmentedControl<'cash' | 'credit'>
              value={invoiceType}
              onChange={setInvoiceType}
              options={[
                { value: 'credit', label: 'Crédito' },
                { value: 'cash', label: 'Contado' },
              ]}
            />
          </FormField>
          <FormField label="Tipo de comprobante (DGII)">
            <select value={comprobanteType} onChange={(e) => setComprobanteType(e.target.value)} className="input">
              {SALE_COMPROBANTE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>
        </div>
        <p className="text-xs text-slate-500 -mt-2">{comprobanteTypeLabel[comprobanteType]}</p>
        {comprobanteWarning && <p className="text-xs text-amber-700">{comprobanteWarning}</p>}

        <div>
          <p className="form-label">Productos</p>
          <ProductPicker products={products} lines={lines} onChange={setLines} emptyMessage="Busque y agregue productos a la factura" />
        </div>

        <div className="invoice-summary-footer space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>ITBIS ({ITBIS_RATE}%)</span>
            <span>{formatCurrency(itbis)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-slate-200 pt-2">
            <span>Total factura</span>
            <span className="text-blue-700">{formatCurrency(total)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading || !clientId} className="btn-primary w-full sm:w-auto disabled:opacity-50">
          {loading ? 'Emitiendo...' : 'Emitir comprobante fiscal'}
        </button>
      </form>
    </DashboardLayout>
  );
}
