'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Minus, Plus, Send } from 'lucide-react';
import { publicFetch } from '@/lib/api';

export default function PublicCatalogPage({ params }: { params: { slug: string } }) {
  const [data, setData] = useState<any>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicFetch(`/catalogs/${params.slug}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.slug]);

  const primaryColor = data?.seller?.branding?.primaryColor || '#00D1FF';
  const products = data?.catalogProducts?.map((cp: any) => cp.product).filter(Boolean) || [];

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const next = { ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) };
      if (next[id] === 0) delete next[id];
      return next;
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const token = data?.publications?.[0]?.token;

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-gray-400">Cargando catálogo...</div>;
  }

  if (!data) {
    return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-gray-400">Catálogo no encontrado</div>;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="p-6 border-b border-white/5" style={{ borderColor: `${primaryColor}20` }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            {data.seller?.branding?.logoUrl && (
              <img src={data.seller.branding.logoUrl} alt="" className="h-8 mb-2" />
            )}
            <h1 className="text-2xl font-bold">{data.name}</h1>
            <p className="text-gray-400 text-sm">{data.description}</p>
          </div>
          {data.seller?.branding?.welcomeMessage && (
            <p className="text-sm text-gray-500 max-w-xs hidden md:block">{data.seller.branding.welcomeMessage}</p>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {products.map((product: any) => (
            <motion.div key={product.id} className="glass rounded-3xl overflow-hidden">
              <div className="aspect-square relative">
                <img
                  src={product.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                <p className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>
                  ${product.b2bPrice || product.basePrice}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Stock: {product.stockLevels?.[0]?.onHandBase || '—'}</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateQty(product.id, -1)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-bold">{cart[product.id] || 0}</span>
                    <button onClick={() => updateQty(product.id, 1)} className="w-8 h-8 rounded-full flex items-center justify-center text-black font-bold" style={{ backgroundColor: primaryColor }}>
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {totalItems > 0 && token && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50">
          <a
            href={`/order/${token}?cart=${encodeURIComponent(JSON.stringify(cart))}`}
            className="max-w-md mx-auto flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-black shadow-2xl"
            style={{ backgroundColor: primaryColor }}
          >
            <ShoppingCart className="w-5 h-5" />
            Pedir ({totalItems} items) <Send className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}
