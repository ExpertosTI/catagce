'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Banknote, Loader2 } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { ClientPicker, PickerClient } from '../../../../components/ClientPicker';
import { SegmentedControl } from '../../../../components/SegmentedControl';
import { ProductPicker, PickedLine, PickerProduct } from '../../../../components/ProductPicker';
import { apiFetch } from '../../../../lib/api';
import { formatCurrency } from '../../../../lib/currency';
import { SALE_COMPROBANTE_OPTIONS, comprobanteTypeLabel } from '../../../../lib/labels';
import type { InvoiceDetail } from '../../../../lib/invoice-utils';
import { normalizeUnitLabel } from '../../../../lib/units';

const ITBIS_RATE = 18;

function suggestComprobante(client?: PickerClient, invoiceType?: 'cash' | 'credit') {
  if (client?.taxId?.trim()) return 'B01';
  return invoiceType === 'credit' ? 'B01' : 'B02';
}

export default function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetClientId = searchParams.get('clientId') ?? '';
  const duplicateId = searchParams.get('duplicate') ?? '';
  const [clients, setClients] = useState<PickerClient[]>([]);
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [clientId, setClientId] = useState('');
  const [invoiceType, setInvoiceType] = useState<'cash' | 'credit'>('credit');
  const [isFiscal, setIsFiscal] = useState(true);
  const [comprobanteType, setComprobanteType] = useState('B01');
  const [payOnIssue, setPayOnIssue] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [lines, setLines] = useState<PickedLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedClient = clients.find((c) => c.id === clientId);

  useEffect(() => {
    apiFetch<any[]>('/clients').then((c) => {
      const billable = c
        .filter((x) => x.status !== 'suspended')
        .map((x) => ({ id: x.id, name: x.name, code: x.code, email: x.email, phone: x.phone, taxId: x.taxId }));
      setClients(billable);
    }).catch(() => setError('No se pudieron cargar los clientes'));
    apiFetch<PickerProduct[]>('/products').then(setProducts).catch(() => setError('No se pudieron cargar los productos'));
  }, []);

  useEffect(() => {
    if (presetClientId) setClientId(presetClientId);
  }, [presetClientId]);

  // Duplicar factura: precarga cliente, condición y líneas de la factura origen
  const [duplicatedFrom, setDuplicatedFrom] = useState('');
  useEffect(() => {
    if (!duplicateId) return;
    apiFetch<InvoiceDetail>(`/invoices/${duplicateId}`)
      .then((src) => {
        setClientId((prev) => prev || (src as InvoiceDetail & { clientId?: string }).clientId || '');
        if (src.invoiceType === 'cash' || src.invoiceType === 'credit') setInvoiceType(src.invoiceType);
        if (typeof src.isFiscal === 'boolean') setIsFiscal(src.isFiscal);
        setLines((src.items ?? []).map((item, idx) => ({
          lineId: `dup-${idx}-${item.id}`,
          productId: (item as typeof item & { productId?: string }).productId ?? '',
          quantity: Number(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice || '0'),
          unitLabel: normalizeUnitLabel(item.unitLabel),
        })).filter((l) => l.productId));
        setDuplicatedFrom(src.ncf ?? src.reference);
      })
      .catch(() => setError('No se pudo cargar la factura a duplicar'));
  }, [duplicateId]);

  useEffect(() => {
    if (isFiscal) setComprobanteType(suggestComprobante(selectedClient, invoiceType));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          unitLabel: normalizeUnitLabel(l.unitLabel),
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
      <Link href="/dashboard/invoices" className="text-blue-700 text-sm font-semibold hover:underline inline-flex items-center gap-1.5 mb-4">
        <ArrowLeft size={16} /> Volver a facturas
      </Link>

      {duplicatedFrom && (
        <p className="max-w-2xl text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 mb-4 animate-fade-in">
          Duplicando la factura <strong>{duplicatedFrom}</strong>. Revise cliente, precios y cantidades antes de emitir; se generará un NCF nuevo.
        </p>
      )}

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
            {comprobanteWarning && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{comprobanteWarning}</p>}
          </>
        )}
        {!isFiscal && (
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
            Proforma / factura interna sin comprobante fiscal. No consume secuencia NCF.
          </p>
        )}

        <div>
          <p className="form-label">Productos</p>
          <ProductPicker products={products} lines={lines} onChange={setLines} emptyMessage="Busque y agregue productos a la factura" />
          <p className="text-xs text-slate-400 mt-2">Puede agregar el mismo producto varias veces con distinto precio o unidad.</p>
        </div>

        {invoiceType === 'cash' && (
          <label className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/60 cursor-pointer">
            <input
              type="checkbox"
              checked={payOnIssue}
              onChange={(e) => setPayOnIssue(e.target.checked)}
              className="w-4 h-4 rounded border-emerald-300 text-emerald-600"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                <Banknote size={16} /> Cobrar al emitir (contado)
              </p>
              <p className="text-xs text-emerald-700/80 mt-0.5">Registra el pago completo y genera recibo automáticamente</p>
            </div>
            {payOnIssue && (
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="input !w-36 text-sm shrink-0"
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

        {lines.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="report-kpi">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Subtotal</p>
              <p className="report-kpi-value text-slate-800">{formatCurrency(subtotal)}</p>
            </div>
            <div className="report-kpi">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ITBIS ({ITBIS_RATE}%)</p>
              <p className="report-kpi-value text-slate-700">{formatCurrency(itbis)}</p>
            </div>
            <div className="report-kpi border-blue-200/80 bg-gradient-to-br from-blue-50/80 to-white">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Total</p>
              <p className="report-kpi-value text-blue-700">{formatCurrency(total)}</p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1 sm:flex-none sm:min-w-[120px]">Cancelar</button>
          <button type="submit" disabled={loading || !clientId} className="btn-primary flex-1 disabled:opacity-50">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
