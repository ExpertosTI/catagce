'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Check, Package, Save, Search } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';

type Product = {
  id: string;
  name: string;
  basePrice?: string;
  sku?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
};

type CatalogDetail = {
  id: string;
  name: string;
  slug: string;
  catalogProducts?: Array<{ productId: string; product?: Product }>;
};

export default function EditCatalogProductsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { ensureAuth, onApiError } = useRequireAuth();

  const [catalog, setCatalog] = useState<CatalogDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!ensureAuth()) return;
    Promise.all([
      apiFetch<CatalogDetail>(`/catalogs/id/${id}`),
      apiFetch<Product[]>('/products'),
    ])
      .then(([cat, prods]) => {
        setCatalog(cat);
        setProducts(prods || []);
        const ids = (cat.catalogProducts || []).map((cp) => cp.productId || cp.product?.id).filter(Boolean) as string[];
        setSelected(new Set(ids));
      })
      .catch((err) => {
        if (!onApiError(err)) setError(getErrorMessage(err, 'No se pudo cargar el catálogo'));
      })
      .finally(() => setLoading(false));
  }, [id, ensureAuth, onApiError, router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q),
    );
  }, [products, query]);

  const toggle = (productId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const updated = await apiFetch<CatalogDetail>(`/catalogs/${id}/products`, {
        method: 'PUT',
        body: JSON.stringify({ productIds: [...selected] }),
      });
      setCatalog(updated);
      setMsg(`Guardado: ${selected.size} producto(s) en el catálogo`);
      setTimeout(() => setMsg(''), 2500);
    } catch (err) {
      if (!onApiError(err)) setError(getErrorMessage(err, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-gray-400">Cargando catálogo...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h2 className="text-xl font-bold truncate">{catalog?.name || 'Catálogo'}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Elige qué productos aparecen en este catálogo
          </p>
        </div>
        <Link href="/dashboard/catalogs" className="text-sm text-gray-400 shrink-0 py-2">
          ← Volver
        </Link>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto…"
          className="w-full min-h-[44px] pl-10 pr-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00D1FF]"
        />
      </div>

      <p className="text-xs text-gray-500 mb-3">
        {selected.size} seleccionado(s) · {products.length} en inventario
      </p>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {msg && <p className="mb-3 text-sm text-green-400">{msg}</p>}

      <div className="space-y-2 pb-28">
        {filtered.map((p) => {
          const on = selected.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left touch-manipulation transition-colors ${
                on ? 'bg-[#00D1FF]/10 border border-[#00D1FF]/40' : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-black/40 overflow-hidden shrink-0 flex items-center justify-center">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-xs text-gray-500">
                  ${p.basePrice ?? '—'}
                  {p.sku ? ` · ${p.sku}` : ''}
                </p>
              </div>
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  on ? 'bg-[#00D1FF] text-black' : 'bg-white/10 text-transparent'
                }`}
              >
                <Check className="w-4 h-4" />
              </span>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-10 text-sm">
            {products.length === 0
              ? 'No hay productos. Impórtalos desde Odoo o créalos en Productos.'
              : 'Ningún producto coincide con la búsqueda.'}
          </p>
        )}
      </div>

      <div className="fixed left-0 right-0 z-30 px-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full min-h-[52px] rounded-2xl bg-[#00D1FF] text-black font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 touch-manipulation"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando…' : `Guardar (${selected.size})`}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
