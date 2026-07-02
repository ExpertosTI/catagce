'use client';

import { useEffect, useState } from 'react';
import DashboardLayout, { PageHeader, ActionButton } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';
import { SITE_URL } from '../../../lib/site';
import { PAGE } from '../../../lib/page-titles';

export default function CatalogsPage() {
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/catalogs').then(setCatalogs).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <PageHeader
        emoji={PAGE.catalogs.emoji}
        title={PAGE.catalogs.title}
        subtitle={PAGE.catalogs.subtitle}
        action={<ActionButton href="/dashboard/catalogs/new" emoji="🆕" label="Nuevo catálogo" />}
      />

      {loading && <p className="text-center text-slate-400 py-12">📚 Cargando catálogos...</p>}

      {!loading && catalogs.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3" aria-hidden>📚</p>
          <p className="font-medium">Sin catálogos</p>
          <p className="text-sm mt-1">Publique su primer catálogo de preventa</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {catalogs.map((c) => (
          <article key={c.id} className="executive-card">
            <div className="flex gap-2 mb-3">
              {c.isPresale && <span className="badge-amber">🛒 Preventa</span>}
              {c.isPublic && <span className="badge-blue">🌐 Público</span>}
            </div>
            <h3 className="font-bold text-lg text-slate-900">{c.name}</h3>
            {c.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{c.description}</p>}
            <a href={`${SITE_URL}/catalogo/${c.slug}`} target="_blank" rel="noreferrer" className="btn-subtle btn-subtle-primary text-xs mt-4 inline-flex">
              🔗 Ver catálogo → /{c.slug}
            </a>
          </article>
        ))}
      </div>
    </DashboardLayout>
  );
}
