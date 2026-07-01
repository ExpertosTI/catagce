'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Save } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ImageUpload } from '@/components/ImageUpload';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { ensureAuth, onApiError } = useRequireAuth();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!ensureAuth()) return;
    apiFetch<any>(`/products/${id}`)
      .then((p) => {
        setName(p.name || '');
        setPrice(p.basePrice || '');
        setStock(p.stockLevels?.[0]?.onHandBase || '0');
        setImageUrl(p.imageUrl || '');
      })
      .catch((err) => {
        if (!onApiError(err)) setError(getErrorMessage(err));
      })
      .finally(() => setLoading(false));
  }, [id, ensureAuth, onApiError]);

  const save = async () => {
    setSaving(true);
    setError('');
    setMsg('');
    try {
      await apiFetch(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          basePrice: parseFloat(price),
          stock: parseFloat(stock) || 0,
          imageUrl: imageUrl || null,
        }),
      });
      setMsg('Producto guardado');
      setTimeout(() => setMsg(''), 2500);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await apiFetch(`/products/${id}`, { method: 'DELETE' });
      router.push('/dashboard/products');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar'));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-gray-400">Cargando...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Editar Producto</h2>
        <Link href="/dashboard/products" className="text-sm text-gray-400 hover:text-white">← Volver</Link>
      </div>

      <div className="glass rounded-2xl p-6 max-w-lg space-y-5">
        <ImageUpload value={imageUrl} onChange={setImageUrl} label="Foto del producto" />

        <div>
          <label className="text-sm text-gray-400 mb-1 block">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00D1FF]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Precio</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Cantidad en stock</label>
            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none"
            />
          </div>
        </div>

        {msg && <p className="text-sm text-green-400">{msg}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[#00D1FF] text-black font-bold rounded-xl disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            onClick={remove}
            className="flex items-center gap-2 px-6 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30"
          >
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
