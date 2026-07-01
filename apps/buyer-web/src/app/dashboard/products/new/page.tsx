'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ImageUpload } from '@/components/ImageUpload';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Plus } from 'lucide-react';

export default function NewProductPage() {
  const router = useRouter();
  const { ensureAuth } = useRequireAuth();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureAuth()) return;
    setLoading(true);
    setError('');
    try {
      await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify({
          name,
          basePrice: parseFloat(price),
          initialStock: stock ? parseFloat(stock) : undefined,
          imageUrl: imageUrl || undefined,
        }),
      });
      router.push('/dashboard/products');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el producto'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-2">Nuevo Producto</h2>
      <p className="text-gray-400 text-sm mb-8">Nombre, precio y foto — listo en segundos.</p>

      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 max-w-lg space-y-4">
        <ImageUpload value={imageUrl} onChange={setImageUrl} label="Foto" />

        <div>
          <label className="text-sm text-gray-400 mb-1 block">Nombre *</label>
          <input
            placeholder="Ej. Polo Básico Blanco"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00D1FF]"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Precio *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00D1FF]"
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Stock</label>
            <input
              type="number"
              min="0"
              placeholder="Opcional"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !name.trim() || !price}
            className="flex items-center gap-2 px-6 py-3 bg-[#00D1FF] text-black font-bold rounded-xl disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> {loading ? 'Guardando...' : 'Crear Producto'}
          </button>
          <Link href="/dashboard/products" className="px-6 py-3 text-gray-400 hover:text-white self-center">
            Cancelar
          </Link>
        </div>
      </form>
    </DashboardLayout>
  );
}
