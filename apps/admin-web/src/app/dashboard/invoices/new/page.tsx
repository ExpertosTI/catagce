'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { QuickClientModal } from '../../../../components/QuickClientModal';
import { apiFetch } from '../../../../lib/api';
import { formatUsd } from '../../../../lib/invoice-utils';

type Line = { productId: string; quantity: number; unitPrice: number };

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clientId, setClientId] = useState('');
  const [invoiceType, setInvoiceType] = useState<'cash' | 'credit'>('credit');
  const [lines, setLines] = useState<Line[]>([{ productId: '', quantity: 1, unitPrice: 0 }]);
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
    Promise.all([loadClients(), apiFetch<any[]>('/products')]).then(([, p]) => setProducts(p));
  }, []);

  const total = useMemo(
    () => lines.reduce((s, l) => s + (l.productId ? l.quantity * l.unitPrice : 0), 0),
    [lines],
  );

  function addLine() {
    setLines([...lines, { productId: '', quantity: 1, unitPrice: 0 }]);
  }

  function removeLine(i: number) {
    if (lines.length === 1) return;
    setLines(lines.filter((_, idx) => idx !== i));
  }

  function updateLine(i: number, field: keyof Line, value: string | number) {
    const updated = [...lines];
    if (field === 'quantity') updated[i].quantity = Math.max(1, Number(value));
    else if (field === 'unitPrice') updated[i].unitPrice = Math.max(0, Number(value));
    else if (field === 'productId') {
      updated[i].productId = String(value);
      const prod = products.find((p) => p.id === value);
      if (prod) updated[i].unitPrice = parseFloat(prod.salePrice);
    }
    setLines(updated);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const items = lines.filter((l) => l.productId);
    if (!items.length) {
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
          items: items.map((l) => ({
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
            <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as 'cash' | 'credit')} className="input">
              <option value="credit">Crédito</option>
              <option value="cash">Contado</option>
            </select>
          </FormField>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="form-label mb-0">Productos</p>
            <button type="button" onClick={addLine} className="text-sm text-blue-700 font-semibold inline-flex items-center gap-1 hover:underline">
              <Plus size={16} /> Agregar línea
            </button>
          </div>

          {lines.map((line, i) => {
            const lineTotal = line.productId ? line.quantity * line.unitPrice : 0;
            return (
              <div key={i} className="line-item-card">
                <div className="grid gap-2 sm:grid-cols-12 sm:items-end">
                  <div className="sm:col-span-5">
                    <label className="text-xs text-slate-500 mb-1 block">Producto</label>
                    <select value={line.productId} onChange={(e) => updateLine(i, 'productId', e.target.value)} className="input" required={i === 0}>
                      <option value="">Seleccionar producto</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatUsd(p.salePrice)}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-500 mb-1 block">Cantidad</label>
                    <input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} className="input" />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-xs text-slate-500 mb-1 block">Precio unitario</label>
                    <input type="number" step="0.01" min={0} value={line.unitPrice} onChange={(e) => updateLine(i, 'unitPrice', e.target.value)} className="input" />
                  </div>
                  <div className="sm:col-span-2 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-500">Subtotal</p>
                      <p className="font-bold text-blue-700">{formatUsd(lineTotal)}</p>
                    </div>
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" aria-label="Eliminar línea">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="invoice-summary-footer">
          <div className="flex justify-between font-bold text-lg">
            <span>Total factura</span>
            <span className="text-blue-700">{formatUsd(total)}</span>
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
