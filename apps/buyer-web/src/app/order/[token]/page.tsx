'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Send, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface CatalogProduct {
  id: string;
  product: {
    id: string;
    name: string;
    basePrice: string;
    imageUrl: string | null;
    baseUom?: { symbol: string };
  };
}

interface Catalog {
  id: string;
  name: string;
  slug: string;
  catalogProducts: CatalogProduct[];
}

export default function OrderPage({ params }: { params: { token: string } }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadError, setLoadError] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const slug = params.token;
    fetch(`${API_BASE}/api/catalogs/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error('Catalog not found');
        return r.json();
      })
      .then((data: Catalog) => {
        setCatalog(data);
        const initial: Record<string, number> = {};
        data.catalogProducts.forEach((cp) => { initial[cp.product.id] = 1; });
        setQuantities(initial);
      })
      .catch(() => setLoadError('Catálogo no encontrado o expirado.'));
  }, [params.token]);

  const selectedItems = catalog?.catalogProducts.filter(
    (cp) => (quantities[cp.product.id] ?? 0) > 0,
  ) ?? [];

  const total = selectedItems.reduce(
    (sum, cp) => sum + parseFloat(cp.product.basePrice) * (quantities[cp.product.id] ?? 0),
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      const idempotencyKey = `${params.token}-${Date.now()}`;
      const res = await fetch(`${API_BASE}/api/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogSlug: params.token,
          buyerName: formData.name,
          buyerPhone: formData.phone,
          idempotencyKey,
          items: selectedItems.map((cp) => ({
            productId: cp.product.id,
            quantity: quantities[cp.product.id] ?? 1,
            unitPrice: parseFloat(cp.product.basePrice),
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al enviar el pedido');
      }
      setStep(3);
    } catch (err: any) {
      setSubmitError(err.message ?? 'Error inesperado. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-gray-400">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <p className="text-gray-500">Cargando catálogo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <ShoppingCart className="text-black w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl">{catalog.name}</h1>
          </div>
          <div className="text-sm text-gray-500 font-mono">/{params.token.slice(0, 10)}</div>
        </header>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-bold mb-6">Selecciona productos</h2>
            <div className="space-y-4 mb-10">
              {catalog.catalogProducts.map((cp) => (
                <div
                  key={cp.id}
                  className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10"
                >
                  <img
                    src={cp.product.imageUrl ?? 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200&auto=format&fit=crop'}
                    alt={cp.product.name}
                    className="w-16 h-16 rounded-2xl object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold">{cp.product.name}</h3>
                    <p className="text-sm text-gray-400">${cp.product.basePrice} / {cp.product.baseUom?.symbol ?? 'un'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantities((q) => ({ ...q, [cp.product.id]: Math.max(0, (q[cp.product.id] ?? 1) - 1) }))}
                      className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold hover:bg-white/20 transition-colors"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-bold">{quantities[cp.product.id] ?? 0}</span>
                    <button
                      onClick={() => setQuantities((q) => ({ ...q, [cp.product.id]: (q[cp.product.id] ?? 0) + 1 }))}
                      className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold hover:bg-white/20 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedItems.length > 0 && (
              <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center">
                <span className="text-gray-400">{selectedItems.length} producto(s)</span>
                <span className="font-bold text-lg">${total.toFixed(2)}</span>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={selectedItems.length === 0}
              className="w-full py-5 bg-white text-black rounded-3xl font-bold text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-40 disabled:pointer-events-none"
            >
              Confirmar Selección <Send className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-bold mb-6">Información de Contacto</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <User className="w-4 h-4" /> Nombre Completo
                </label>
                <input
                  required
                  type="text"
                  placeholder="Juan Pérez"
                  className="w-full h-14 px-6 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500 focus:outline-none transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Número de WhatsApp
                </label>
                <input
                  required
                  type="tel"
                  placeholder="+1 (809) 000-0000"
                  className="w-full h-14 px-6 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500 focus:outline-none transition-all"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              {submitError && <p className="text-red-400 text-sm">{submitError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-5 bg-blue-600 text-white rounded-3xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {submitting ? 'Enviando...' : 'Realizar Pedido'}
              </button>
              <button type="button" onClick={() => setStep(1)} className="w-full text-gray-500 text-sm hover:text-white transition-colors">
                ← Modificar selección
              </button>
            </form>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-bold mb-4">¡Pedido Recibido!</h2>
            <p className="text-gray-400 mb-10 leading-relaxed">
              Gracias {formData.name}, hemos recibido tu pedido.
              <br />
              El vendedor se pondrá en contacto contigo por WhatsApp pronto.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-gray-400 hover:text-white transition-all"
            >
              Volver al Inicio
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
