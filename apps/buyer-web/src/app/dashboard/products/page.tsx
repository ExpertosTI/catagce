'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { LayoutGrid, Plus } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LoadingState } from '@/components/LoadingState';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function ProductsPage() {
  const router = useRouter();
  const { ensureAuth, onApiError } = useRequireAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ensureAuth()) return;
    apiFetch<any[]>('/products')
      .then(setProducts)
      .catch((err) => {
        if (!onApiError(err)) setError(getErrorMessage(err));
      })
      .finally(() => setLoading(false));
  }, [router, ensureAuth, onApiError]);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingState message="Cargando productos..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Productos</h2>
        <Link href="/dashboard/products/new" className="flex items-center gap-2 px-4 py-2 bg-[#00D1FF] text-black font-bold rounded-xl text-sm">
          <Plus className="w-4 h-4" /> Nuevo
        </Link>
      </div>

      {error && <p className="mb-6 text-sm text-red-400">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Link key={product.id} href={`/dashboard/products/${product.id}`}>
          <motion.div
            whileHover={{ y: -4 }}
            className="glass rounded-3xl overflow-hidden cursor-pointer"
          >
            <div className="aspect-[4/3] relative">
              <img
                src={product.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-lg font-bold">{product.name}</h3>
                {product.sku && <p className="text-xs text-gray-400 font-mono">{product.sku}</p>}
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-2xl font-bold text-[#00D1FF]">${product.basePrice}</p>
                  {product.b2bPrice && (
                    <p className="text-sm text-gray-400">B2B: ${product.b2bPrice}</p>
                  )}
                </div>
                <div className="text-right text-sm text-gray-400">
                  <LayoutGrid className="w-4 h-4 inline mr-1" />
                  Stock: {product.stockLevels?.[0]?.onHandBase || 0}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                {product.views || 0} vistas
                {product.externalSource && (
                  <span className="ml-auto px-2 py-0.5 bg-white/5 rounded-full uppercase text-[10px]">
                    {product.externalSource}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
          </Link>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p>No hay productos. Conecta Odoo en Configuración para importar.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
