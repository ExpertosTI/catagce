'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Loader2, Search } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { LoadingState } from '../../../../components/LoadingState';
import { apiFetch } from '../../../../lib/api';
import { formatCurrency } from '../../../../lib/currency';
import { PAGE } from '../../../../lib/page-titles';

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

  if (fetching) {
    return (
      <DashboardLayout>
        <LoadingState message="Cargando productos..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Link href="/dashboard/catalogs" className="text-blue-700 text-sm font-semibold hover:underline inline-flex items-center gap-1.5 mb-4">
        <ArrowLeft size={16} /> Volver a catálogos
      </Link>
      <PageHeader emoji={PAGE.catalogsNew.emoji} title={PAGE.catalogsNew.title} subtitle={PAGE.catalogsNew.subtitle} />

      <form onSubmit={submit} className="form-card max-w-lg space-y-5">
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

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input type="checkbox" checked={form.isPresale} onChange={(e) => setForm({ ...form, isPresale: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="text-sm font-medium text-slate-700">Es preventa</span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="text-sm font-medium text-slate-700">Visible públicamente</span>
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="form-label !mb-0">Productos incluidos</p>
            {selected.length > 0 && (
              <span className="badge-blue tabular-nums">{selected.length} seleccionados</span>
            )}
          </div>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="input !pl-9 text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
            {!filteredProducts.length && (
              <p className="text-sm text-slate-400 text-center py-8">Sin productos que coincidan</p>
            )}
            {filteredProducts.map((p) => {
              const checked = selected.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 text-sm cursor-pointer px-3 py-2.5 rounded-xl border transition-all ${
                    checked ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:border-slate-200'
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleProduct(p.id)} className="w-4 h-4 rounded" />
                  <span className="flex-1 truncate font-medium text-slate-800">{p.name}</span>
                  {p.salePrice && <span className="text-xs text-slate-500 tabular-nums shrink-0">{formatCurrency(p.salePrice)}</span>}
                </label>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
            {loading ? 'Creando...' : 'Crear catálogo'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
