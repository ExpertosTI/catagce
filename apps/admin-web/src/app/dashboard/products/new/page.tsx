'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { apiFetch } from '../../../../lib/api';

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({ sku: '', name: '', description: '', salePrice: '', costPrice: '', imageUrl: '' });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          salePrice: parseFloat(form.salePrice),
          costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
        }),
      });
      router.push('/dashboard/products');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title="Nuevo producto" />
      <form onSubmit={submit} className="card p-6 max-w-lg space-y-4">
        <input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input" required />
        <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required />
        <textarea placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={3} />
        <div className="grid grid-cols-2 gap-4">
          <input type="number" step="0.01" placeholder="Precio venta" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} className="input" required />
          <input type="number" step="0.01" placeholder="Costo" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} className="input" />
        </div>
        <input placeholder="URL imagen" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="input" />
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">Crear producto</button>
      </form>
    </DashboardLayout>
  );
}
