'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { apiFetch } from '../../../../lib/api';
import { formatCurrency } from '../../../../lib/currency';

type Product = { id: string; name: string; sku?: string; salePrice?: string };

export default function NewCatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({ name: '', slug: '', description: '', isPresale: true, isPublic: true });
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Product[]>('/products')
      .then(setProducts)
      .catch(() => setError('No se pudieron cargar los productos'))
      .finally(() => setFetching(false));
  }, []);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
  }, [products, query]);

  function toggleProduct(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!selected.length) {
      setError('Seleccione al menos un producto para el catálogo');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/catalogs', {
        method: 'POST',
        body: JSON.stringify({ ...form, productIds: selected }),
      });
      router.push('/dashboard/catalogs');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear el catálogo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title="Nuevo catálogo" subtitle="Cree un catálogo público de preventa para compartir con sus clientes" />
      <form onSubmit={submit} className="form-card max-w-lg space-y-4">
        <FormField label="Nombre del catálogo">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') })}
            className="input" required placeholder="Preventa Julio 2026"
          />
        </FormField>
        <FormField label="Identificador de URL" hint="Se usará en el enlace público que comparta con sus clientes">
          <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input" required placeholder="preventa-julio-2026" />
        </FormField>
        <FormField label="Descripción (opcional)">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={2} />
        </FormField>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isPresale} onChange={(e) => setForm({ ...form, isPresale: e.target.checked })} /> Es preventa
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} /> Visible públicamente
          </label>
        </div>
        <div>
          <p className="form-label">Productos incluidos {selected.length > 0 && <span className="text-blue-700">({selected.length} seleccionados)</span>}</p>
          <div className="relative mb-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="input !pl-9 text-sm"
            />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2">
            {fetching && <p className="text-sm text-slate-400 text-center py-6">Cargando productos...</p>}
            {!fetching && !filteredProducts.length && (
              <p className="text-sm text-slate-400 text-center py-6">Sin productos que coincidan</p>
            )}
            {!fetching && filteredProducts.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer px-2 py-1.5 rounded-lg hover:bg-slate-50">
                <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                <span className="flex-1 truncate">{p.name}</span>
                {p.salePrice && <span className="text-xs text-slate-400">{formatCurrency(p.salePrice)}</span>}
              </label>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? 'Creando...' : 'Crear catálogo'}
        </button>
      </form>
    </DashboardLayout>
  );
}
