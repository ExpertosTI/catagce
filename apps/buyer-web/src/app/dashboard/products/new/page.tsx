'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Plus } from 'lucide-react';

export default function NewProductPage() {
  const router = useRouter();
  const { ensureAuth } = useRequireAuth();
  const [uoms, setUoms] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '', sku: '', description: '', category: '', basePrice: '', b2bPrice: '',
    baseUomId: 0, imageUrl: '', initialStock: '', warehouseId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ensureAuth()) return;
    Promise.all([apiFetch<any[]>('/inventory/uoms'), apiFetch<any[]>('/inventory/warehouses')])
      .then(([u, w]) => {
        setUoms(u);
        setWarehouses(w);
        if (u[0]) setForm((f) => ({ ...f, baseUomId: u[0].id }));
        if (w[0]) setForm((f) => ({ ...f, warehouseId: w[0].id }));
      });
  }, [router, ensureAuth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          basePrice: parseFloat(form.basePrice),
          b2bPrice: form.b2bPrice ? parseFloat(form.b2bPrice) : undefined,
          initialStock: form.initialStock ? parseFloat(form.initialStock) : undefined,
        }),
      });
      router.push('/dashboard/products');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-8">Nuevo Producto</h2>

      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 max-w-lg space-y-4">
        <input placeholder="Nombre del producto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00D1FF]" required />
        <div className="grid grid-cols-2 gap-4">
          <input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none" />
          <input placeholder="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none" />
        </div>
        <textarea placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full h-24 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none resize-none" />
        <div className="grid grid-cols-2 gap-4">
          <input type="number" step="0.01" placeholder="Precio base" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none" required />
          <input type="number" step="0.01" placeholder="Precio B2B" value={form.b2bPrice} onChange={(e) => setForm({ ...form, b2bPrice: e.target.value })} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none" />
        </div>
        <input placeholder="URL de imagen" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none" />
        <div className="grid grid-cols-2 gap-4">
          <select value={form.baseUomId} onChange={(e) => setForm({ ...form, baseUomId: parseInt(e.target.value) })} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none">
            {uoms.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input type="number" placeholder="Stock inicial" value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none" />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-[#00D1FF] text-black font-bold rounded-xl disabled:opacity-50">
            <Plus className="w-4 h-4" /> {loading ? 'Guardando...' : 'Crear Producto'}
          </button>
          <Link href="/dashboard/products" className="px-6 py-3 text-gray-400 hover:text-white">Cancelar</Link>
        </div>
      </form>
    </DashboardLayout>
  );
}
