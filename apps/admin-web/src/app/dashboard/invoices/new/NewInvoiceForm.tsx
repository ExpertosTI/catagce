'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { ClientPicker, PickerClient } from '../../../../components/ClientPicker';
import { SegmentedControl } from '../../../../components/SegmentedControl';
import { ProductPicker, PickedLine, PickerProduct } from '../../../../components/ProductPicker';
import { apiFetch } from '../../../../lib/api';
import { formatCurrency } from '../../../../lib/currency';
import { PAGE } from '../../../../lib/page-titles';
import { SALE_COMPROBANTE_OPTIONS, comprobanteTypeLabel } from '../../../../lib/labels';

const ITBIS_RATE = 18;

function suggestComprobante(client?: PickerClient, invoiceType?: 'cash' | 'credit') {
  if (client?.taxId?.trim()) return 'B01';
  return invoiceType === 'credit' ? 'B01' : 'B02';
}

export default function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetClientId = searchParams.get('clientId') ?? '';
  const [clients, setClients] = useState<PickerClient[]>([]);
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [clientId, setClientId] = useState('');
  const [invoiceType, setInvoiceType] = useState<'cash' | 'credit'>('credit');
  const [isFiscal, setIsFiscal] = useState(true);
  const [comprobanteType, setComprobanteType] = useState('B01');
  const [receivedBy, setReceivedBy] = useState('');
  const [dispatchedBy, setDispatchedBy] = useState('');
  const [payOnIssue, setPayOnIssue] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
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
    if (presetClientId) setClientId(presetClientId);
  }, [presetClientId]);

  useEffect(() => {
    if (isFiscal) setComprobanteType(suggestComprobante(selectedClient, invoiceType));
  }, [clientId, invoiceType, selectedClient?.taxId, isFiscal]);

  useEffect(() => {
    setPayOnIssue(invoiceType === 'cash');
  }, [invoiceType]);

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const itbis = useMemo(() => Math.round(subtotal * (ITBIS_RATE / 100) * 100) / 100, [subtotal]);
  const total = subtotal + itbis;

  const comprobanteWarning = isFiscal && comprobanteType === 'B01' && !selectedClient?.taxId?.trim()
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
      const body: Record<string, unknown> = {
        clientId,
        invoiceType,
        isFiscal,
        itbisRate: ITBIS_RATE,
        issue: true,
        receivedBy: receivedBy || undefined,
        dispatchedBy: dispatchedBy || undefined,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          unitLabel: l.unitLabel,
        })),
      };
      if (isFiscal) body.comprobanteType = comprobanteType;
      if (payOnIssue && invoiceType === 'cash' && total > 0) {
        body.initialPayment = { amount: total, method: paymentMethod };
      }
      const created = await apiFetch<{ id: string }>('/invoices', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      router.push(`/dashboard/invoices/${created.id}${payOnIssue && invoiceType === 'cash' ? '?receipt=1' : ''}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al emitir factura');
    } finally {
      setLoading(false);
    }
  }

  const submitLabel = loading
    ? 'Emitiendo...'
    : isFiscal
      ? 'Emitir comprobante fiscal'
      : 'Emitir factura proforma';

  return (
    <DashboardLayout>
      <PageHeader emoji={PAGE.invoicesNew.emoji} title={PAGE.invoicesNew.title} subtitle={PAGE.invoicesNew.subtitle} />

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
          <FormField label="Documento a emitir">
            <SegmentedControl
              value={isFiscal ? 'fiscal' : 'proforma'}
              onChange={(v) => setIsFiscal(v === 'fiscal')}
              options={[
                { value: 'fiscal', label: 'Con NCF fiscal' },
                { value: 'proforma', label: 'Sin NCF' },
              ]}
            />
          </FormField>
        </div>

        {isFiscal && (
          <>
            <FormField label="Tipo de comprobante (DGII)">
              <select value={comprobanteType} onChange={(e) => setComprobanteType(e.target.value)} className="input">
                {SALE_COMPROBANTE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>
            <p className="text-xs text-slate-500 -mt-2">{comprobanteTypeLabel[comprobanteType]}</p>
            {comprobanteWarning && <p className="text-xs text-amber-700">{comprobanteWarning}</p>}
          </>
        )}
        {!isFiscal && (
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            Proforma / factura interna sin comprobante fiscal. No consume secuencia NCF.
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Recibido por">
            <input
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              className="input"
              placeholder="Nombre de quien recibe la mercancía"
            />
          </FormField>
          <FormField label="Despachado por">
            <input
              value={dispatchedBy}
              onChange={(e) => setDispatchedBy(e.target.value)}
              className="input"
              placeholder="Nombre de quien despacha"
            />
          </FormField>
        </div>

        <div>
          <p className="form-label">Productos</p>
          <ProductPicker products={products} lines={lines} onChange={setLines} emptyMessage="Busque y agregue productos a la factura" />
          <p className="text-xs text-slate-400 mt-2">Puede agregar el mismo producto varias veces con distinto precio o unidad.</p>
        </div>

        {invoiceType === 'cash' && (
          <label className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/60 cursor-pointer">
            <input
              type="checkbox"
              checked={payOnIssue}
              onChange={(e) => setPayOnIssue(e.target.checked)}
              className="w-4 h-4 rounded border-emerald-300 text-emerald-600"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800">💰 Cobrar al emitir (contado)</p>
              <p className="text-xs text-emerald-700/80">Registra el pago completo y genera recibo automáticamente</p>
            </div>
            {payOnIssue && (
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="input !w-36 text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
                <option value="check">Cheque</option>
              </select>
            )}
          </label>
        )}

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
          {submitLabel}
        </button>
      </form>
    </DashboardLayout>
  );
}
