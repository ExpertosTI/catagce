'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShoppingCart, Send, User, Phone, CheckCircle2 } from 'lucide-react';
import { publicFetch } from '@/lib/api';

function OrderContent({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [catalogData, setCatalogData] = useState<any>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    publicFetch(`/public/catalog/${token}`).then(setCatalogData).catch(console.error);

    const cartParam = searchParams.get('cart');
    if (cartParam) {
      try { setCart(JSON.parse(cartParam)); } catch { /* ignore */ }
    }
  }, [token, searchParams]);

  const products = catalogData?.catalog?.catalogProducts
    ?.map((cp: any) => cp.product)
    .filter(Boolean) || [];

  const selectedProducts = products.filter((p: any) => cart[p.id] > 0);
  const displayProducts = selectedProducts.length > 0 ? selectedProducts : products.slice(0, 2);

  const getQty = (id: string) => cart[id] || 1;

  const total = displayProducts.reduce((sum: number, p: any) => {
    const price = parseFloat(p.b2bPrice || p.basePrice);
    return sum + price * getQty(p.id);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const items = displayProducts.map((p: any) => ({
        productId: p.id,
        quantity: getQty(p.id),
      }));

      const response = await publicFetch('/public/orders', {
        method: 'POST',
        body: JSON.stringify({
          token,
          buyerName: formData.name,
          buyerPhone: formData.phone,
          items,
        }),
      });

      if (response) setStep(3);
    } catch (error) {
      console.error('Order failed:', error);
      alert('Error al enviar el pedido. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const primaryColor = catalogData?.branding?.primaryColor || '#00D1FF';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
              <ShoppingCart className="text-black w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl">
              {catalogData?.catalog?.name || 'Pedido Rápido'}
            </h1>
          </div>
        </header>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-bold mb-6">Revisa tu selección</h2>
            <div className="space-y-4 mb-10">
              {displayProducts.map((product: any) => (
                <div key={product.id} className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10">
                  <img
                    src={product.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200'}
                    alt={product.name}
                    className="w-16 h-16 rounded-2xl object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold">{product.name}</h3>
                    <p className="text-sm text-gray-400">${product.b2bPrice || product.basePrice}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">x{getQty(product.id)}</p>
                    <p className="text-xs text-gray-500">
                      ${(parseFloat(product.b2bPrice || product.basePrice) * getQty(product.id)).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mb-6 text-lg">
              <span className="text-gray-400">Total</span>
              <span className="font-bold text-2xl" style={{ color: primaryColor }}>${total.toFixed(2)}</span>
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full py-5 text-black rounded-3xl font-bold text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
              style={{ backgroundColor: primaryColor }}
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
                  className="w-full h-14 px-6 bg-white/5 border border-white/10 rounded-2xl focus:outline-none transition-all"
                  style={{ borderColor: undefined }}
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
                  className="w-full h-14 px-6 bg-white/5 border border-white/10 rounded-2xl focus:outline-none transition-all"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-5 text-black rounded-3xl font-bold text-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? 'Enviando...' : 'Realizar Pedido'}
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
              Gracias {formData.name}, hemos recibido tu pedido por ${total.toFixed(2)}. <br />
              El vendedor se pondrá en contacto contigo por WhatsApp pronto.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function OrderPage({ params }: { params: { token: string } }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-gray-400">Cargando...</div>}>
      <OrderContent token={params.token} />
    </Suspense>
  );
}
