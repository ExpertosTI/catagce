'use client';

import { useEffect, useState } from 'react';
import DashboardLayout, { PageHeader, ActionButton } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    apiFetch<any[]>('/products').then(setProducts).catch(console.error);
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="Mercancía" subtitle="Catálogo de productos importados" action={<ActionButton href="/dashboard/products/new" label="Nuevo producto" />} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-44 object-cover" />}
            <div className="p-4">
              <p className="text-xs text-slate-500">{p.sku}</p>
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-blue-700 font-bold mt-2">${parseFloat(p.salePrice).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
