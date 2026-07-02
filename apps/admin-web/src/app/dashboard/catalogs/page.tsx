'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Plus, Search, Globe, ShoppingBag, Copy, Check } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { LoadingState } from '../../../components/LoadingState';
import { apiFetch } from '../../../lib/api';
import { SITE_URL } from '../../../lib/site';
import { PAGE } from '../../../lib/page-titles';

type Catalog = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isPresale?: boolean;
  isPublic?: boolean;
};

export default function CatalogsPage() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Catalog[]>('/catalogs').then(setCatalogs).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalogs;
    return catalogs.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
  }, [catalogs, query]);

  async function copyLink(c: Catalog) {
    const url = `${SITE_URL}/catalogo/${c.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* noop */ }
  }

  return (
    <DashboardLayout>
      <PageHeader
        emoji={PAGE.catalogs.emoji}
        title={PAGE.catalogs.title}
        subtitle={PAGE.catalogs.subtitle}
        action={(
          <Link href="/dashboard/catalogs/new" className="btn-primary text-sm">
            <Plus size={16} /> Nuevo catálogo
          </Link>
        )}
      />

      {!loading && catalogs.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5 max-w-md">
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium">📚 Catálogos</p>
            <p className="report-kpi-value text-slate-800">{catalogs.length}</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Globe size={14} /> Públicos</p>
            <p className="report-kpi-value text-blue-700">{catalogs.filter((c) => c.isPublic).length}</p>
          </div>
        </div>
      )}

      {catalogs.length > 0 && (
        <div className="relative mb-5">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-search" placeholder="Buscar catálogo..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      {loading && <LoadingState emoji="📚" message="Cargando catálogos..." />}

      {!loading && catalogs.length === 0 && (
        <div className="executive-card text-center py-16 text-slate-500">
          <p className="text-4xl mb-3" aria-hidden>📚</p>
          <p className="font-semibold text-slate-700">Sin catálogos</p>
          <p className="text-sm mt-1">Publique su primer catálogo de preventa</p>
          <Link href="/dashboard/catalogs/new" className="btn-primary text-sm mt-4 inline-flex">Nuevo catálogo</Link>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <article key={c.id} className="executive-card hover:shadow-md transition-shadow">
            <div className="flex gap-2 mb-3">
              {c.isPresale && <span className="badge-amber flex items-center gap-1"><ShoppingBag size={11} /> Preventa</span>}
              {c.isPublic && <span className="badge-blue flex items-center gap-1"><Globe size={11} /> Público</span>}
            </div>
            <h3 className="font-bold text-lg text-slate-900">{c.name}</h3>
            {c.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{c.description}</p>}
            <p className="text-xs text-slate-400 mt-2 font-mono">/{c.slug}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <a href={`${SITE_URL}/catalogo/${c.slug}`} target="_blank" rel="noreferrer" className="action-chip action-chip-success">
                <ExternalLink size={14} /> <span className="!inline">Abrir</span>
              </a>
              <button type="button" onClick={() => copyLink(c)} className="action-chip">
                {copiedId === c.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span className="!inline">{copiedId === c.id ? 'Copiado' : 'Copiar link'}</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </DashboardLayout>
  );
}
