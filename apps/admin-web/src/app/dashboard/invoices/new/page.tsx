'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { apiFetch } from '../../../../lib/api';

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clientId, setClientId] = useState('');
  const [invoiceType, setInvoiceType] = useState<'cash' | 'credit'>('credit');
  const [lines, setLines] = useState([{ productId: '', quantity: 1, unitPrice: 0 }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([apiFetch<any[]>('/clients'), apiFetch<any[]>('/products')]).then(([c, p]) => {
      setClients(c.filter((x) => x.status === 'active'));
      setProducts(p);
      if (c.length) setClientId(c[0].id);
    });
  }, []);

  function addLine() {
    setLines([...lines, { productId: '', quantity: 1, unitPrice: 0 }]);
  }

  function updateLine(i: number, field: string, value: any) {
    const updated = [...lines];
    (updated[i] as any)[field] = value;
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      if (prod) updated[i].unitPrice = parseFloat(prod.salePrice);
    }
    setLines(updated);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          invoiceType,
          issue: true,
          items: lines.filter((l) => l.productId).map((l) => ({
            productId: l.productId,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
          })),
        }),
      });
      router.push('/dashboard/invoices');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title="Nueva factura" subtitle="Emitir factura al contado o a crédito" />
      <form onSubmit={submit} className="card p-6 max-w-2xl space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Cliente</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="input mt-1" required>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Tipo</label>
          <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as any)} className="input mt-1">
            <option value="credit">Crédito</option>
            <option value="cash">Contado</option>
          </select>
        </div>
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700">Productos</label>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <select value={line.productId} onChange={(e) => updateLine(i, 'productId', e.target.value)} className="input col-span-2" required>
                <option value="">Seleccionar producto</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} className="input" placeholder="Cant." />
              <input type="number" step="0.01" value={line.unitPrice} onChange={(e) => updateLine(i, 'unitPrice', e.target.value)} className="input col-span-3" placeholder="Precio unitario" />
            </div>
          ))}
          <button type="button" onClick={addLine} className="text-sm text-blue-700 hover:underline">+ Agregar línea</button>
        </div>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? 'Emitiendo...' : 'Emitir factura'}
        </button>
      </form>
    </DashboardLayout>
  );
}
