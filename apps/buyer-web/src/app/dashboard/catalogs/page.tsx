'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Copy, Check, Share2, Plus, ExternalLink } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiFetch, getApiKey, getToken } from '@/lib/api';

export default function CatalogsPage() {
  const router = useRouter();
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newCatalog, setNewCatalog] = useState({ name: '', slug: '' });
  const [loading, setLoading] = useState(true);

  const loadCatalogs = () => {
    apiFetch<any[]>('/catalogs').then(setCatalogs).catch(() => router.push('/login'));
  };

  useEffect(() => {
    if (!getApiKey() && !getToken()) { router.push('/login'); return; }
    loadCatalogs();
    setLoading(false);
  }, [router]);

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/order/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/catalogs', {
      method: 'POST',
      body: JSON.stringify(newCatalog),
    });
    setShowCreate(false);
    setNewCatalog({ name: '', slug: '' });
    loadCatalogs();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Catálogos</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#00D1FF] text-black font-bold rounded-xl text-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="glass rounded-2xl p-6 mb-6 space-y-4">
          <input
            placeholder="Nombre del catálogo"
            value={newCatalog.name}
            onChange={(e) => setNewCatalog({ ...newCatalog, name: e.target.value })}
            className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00D1FF]"
            required
          />
          <input
            placeholder="slug-url-amigable"
            value={newCatalog.slug}
            onChange={(e) => setNewCatalog({ ...newCatalog, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
            className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00D1FF] font-mono text-sm"
            required
          />
          <div className="flex gap-3">
            <button type="submit" className="px-6 py-2 bg-[#00D1FF] text-black font-bold rounded-xl">Crear</button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-2 text-gray-400">Cancelar</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {catalogs.map((catalog) => {
          const token = catalog.publications?.[0]?.token || catalog.shareToken;
          return (
            <motion.div key={catalog.id} className="glass rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">{catalog.name}</h3>
                  <p className="text-gray-400 text-sm">{catalog.description}</p>
                  <p className="text-xs text-gray-600 font-mono mt-1">
                    {catalog.catalogProducts?.length || 0} productos · /catalog/{catalog.slug}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/catalog/${catalog.slug}`}
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl text-sm hover:bg-white/10 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> Ver
                  </a>
                  {token && (
                    <button
                      onClick={() => copyShareLink(token)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#FF8A00] text-black font-bold rounded-xl text-sm"
                    >
                      {copied === token ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                      {copied === token ? 'Copiado' : 'Compartir'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {catalogs.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <Copy className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Crea tu primer catálogo para compartir con clientes.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
