'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import DashboardLayout, { PageHeader, ActionButton } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';
import { PAGE } from '../../../lib/page-titles';
import { useAppDialog } from '../../../components/AppDialogProvider';
import { formatCurrency } from '../../../lib/currency';

type Product = {
  id: string;
  sku: string;
  name: string;
  salePrice: string;
  imageUrl?: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, alert } = useAppDialog();

  function load() {
    setLoading(true);
    apiFetch<Product[]>('/products').then(setProducts).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string, name: string) {
    const ok = await confirm({
      title: 'Eliminar producto',
      message: `¿Eliminar "${name}"?\nEl producto se ocultará del catálogo.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await apiFetch(`/products/${id}`, { method: 'DELETE' });
      load();
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'No se pudo eliminar', variant: 'error' });
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        emoji={PAGE.products.emoji}
        title={PAGE.products.title}
        subtitle={PAGE.products.subtitle}
        action={<ActionButton href="/dashboard/products/new" emoji="➕" label="Nuevo producto" />}
      />

      {loading && <p className="text-center text-slate-500 py-12">📦 Cargando productos...</p>}

      {!loading && products.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3" aria-hidden>📦</p>
          <p className="font-medium">Sin productos</p>
          <p className="text-sm mt-1">Agregue su primera mercancía</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <article key={p.id} className="product-card group">
            <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-slate-300" aria-hidden>📦</div>
              )}
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500 font-medium">{p.sku}</p>
              <h3 className="font-bold text-slate-900 mt-0.5 line-clamp-2">{p.name}</h3>
              <p className="text-blue-700 font-extrabold text-lg mt-2">{formatCurrency(p.salePrice)}</p>
              <div className="flex gap-2 mt-4 action-bar !p-2">
                <Link href={`/dashboard/products/${p.id}`} className="btn-subtle btn-subtle-primary flex-1 text-xs justify-center">
                  <Pencil size={15} /> Editar
                </Link>
                <button type="button" onClick={() => remove(p.id, p.name)} className="btn-subtle btn-subtle-danger text-xs">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </DashboardLayout>
  );
}
