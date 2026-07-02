'use client';

import { useEffect, useState } from 'react';
import DashboardLayout, { PageHeader, ActionButton } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';
import { SITE_URL } from '../../../lib/site';

export default function CatalogsPage() {
  const [catalogs, setCatalogs] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/catalogs').then(setCatalogs).catch(console.error);
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="Catálogos" subtitle="Preventas y catálogos públicos" action={<ActionButton href="/dashboard/catalogs/new" label="Nuevo catálogo" />} />
      <div className="grid md:grid-cols-2 gap-4">
        {catalogs.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex gap-2 mb-2">
              {c.isPresale && <span className="badge-amber">Preventa</span>}
              {c.isPublic && <span className="badge-blue">Público</span>}
            </div>
            <h3 className="font-semibold text-lg">{c.name}</h3>
            <p className="text-sm text-slate-500 mt-1">{c.description}</p>
            <a href={`${SITE_URL}/catalogo/${c.slug}`} target="_blank" rel="noreferrer" className="text-blue-700 text-sm mt-3 inline-block hover:underline">
              Ver en sitio → /catalogo/{c.slug}
            </a>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
