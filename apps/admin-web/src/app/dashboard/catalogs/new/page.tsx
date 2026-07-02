'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { apiFetch } from '../../../../lib/api';

export default function NewCatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', slug: '', description: '', isPresale: true, isPublic: true });
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<any[]>('/products').then(setProducts);
  }, []);

  function toggleProduct(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/catalogs', {
        method: 'POST',
        body: JSON.stringify({ ...form, productIds: selected }),
      });
      router.push('/dashboard/catalogs');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title="Nuevo catálogo" />
      <form onSubmit={submit} className="card p-6 max-w-lg space-y-4">
        <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="input" required />
        <input placeholder="Slug URL" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input" required />
        <textarea placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={2} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPresale} onChange={(e) => setForm({ ...form, isPresale: e.target.checked })} /> Preventa</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} /> Público</label>
        <div>
          <p className="text-sm font-medium mb-2">Productos</p>
          <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3">
            {products.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                {p.name}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">Crear catálogo</button>
      </form>
    </DashboardLayout>
  );
}
