'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShoppingCart, Send, User, Phone, CheckCircle2, MessageCircle, Minus, Plus } from 'lucide-react';
import { publicFetch } from '@/lib/api';
import { buildOrderMessage, buildWhatsAppUrl } from '@/lib/whatsapp';

function stockOf(product: any) {
  const levels = product?.stockLevels || [];
  if (!levels.length) return null;
  return levels.reduce((s: number, l: any) => s + Number(l.quantityOnHand || l.available || 0), 0);
}

function OrderContent({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const src = searchParams.get('src') || 'web';
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [catalogData, setCatalogData] = useState<any>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);

  useEffect(() => {
    const p = searchParams.get('p');
    const qs = p ? `?p=${encodeURIComponent(p)}` : '';
    publicFetch(`/public/catalog/${token}${qs}`).then((data: any) => {
      setCatalogData(data);
      if (data?.prefill) {
        setFormData((f) => ({
          name: data.prefill.name || f.name,
          phone: data.prefill.phone || f.phone,
        }));
      }
    }).catch(console.error);
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

  const setQty = (id: string, qty: number) => {
    if (qty < 1) return;
    setCart((c) => ({ ...c, [id]: qty }));
  };

  const total = displayProducts.reduce((sum: number, p: any) => {
    const price = parseFloat(p.b2bPrice || p.basePrice);
    return sum + price * getQty(p.id);
  }, 0);

  const catalogName = catalogData?.catalog?.name || 'Catálogo';
  const sellerWhatsApp = catalogData?.whatsappNumber || catalogData?.seller?.phone || '';
  const primaryColor = catalogData?.branding?.primaryColor || '#00D1FF';

  const orderItems = displayProducts.map((p: any) => ({
    name: p.name,
    qty: getQty(p.id),
    lineTotal: parseFloat(p.b2bPrice || p.basePrice) * getQty(p.id),
  }));

  const whatsappMessage = buildOrderMessage({
    buyerName: formData.name || 'Cliente',
    catalogName,
    items: orderItems,
    total,
    orderId: orderId || undefined,
    trackingUrl: trackingUrl || undefined,
  });

  const whatsappUrl = sellerWhatsApp ? buildWhatsAppUrl(sellerWhatsApp, whatsappMessage) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const items = displayProducts.map((p: any) => ({
        productId: p.id,
        quantity: getQty(p.id),
      }));

      const order = await publicFetch<any>('/public/orders', {
        method: 'POST',
        body: JSON.stringify({
          token,
          buyerName: formData.name,
          buyerPhone: formData.phone,
          items,
          source: src === 'wa' ? 'whatsapp_link' : 'web',
        }),
      });

      setOrderId(order?.id || null);
      setOrderRef(order?.ref || (order?.id ? String(order.id).replace(/-/g, '').slice(0, 8) : null));
      setTrackingUrl(order?.trackingUrl || null);
      setStep(3);
    } catch {
      alert('Error al enviar el pedido. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8 pb-28">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
              <ShoppingCart className="text-black w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-xl">{catalogName}</h1>
              <p className="text-xs text-gray-500">Pedido sincronizado con WhatsApp</p>
            </div>
          </div>
        </header>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-bold mb-6">Tu carrito</h2>
            <div className="space-y-4 mb-6">
              {displayProducts.map((product: any) => {
                const stock = stockOf(product);
                return (
                  <div key={product.id} className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10">
                    <img
                      src={product.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200'}
                      alt={product.name}
                      className="w-16 h-16 rounded-2xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate">{product.name}</h3>
                      <p className="text-sm text-gray-400">${product.b2bPrice || product.basePrice}</p>
                      {stock !== null && (
                        <p className="text-[10px] text-gray-500 mt-0.5">Stock: {stock}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQty(product.id, getQty(product.id) - 1)}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center font-bold">{getQty(product.id)}</span>
                      <button
                        type="button"
                        onClick={() => setQty(product.id, getQty(product.id) + 1)}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-4 z-10 rounded-3xl border border-white/10 bg-black/80 backdrop-blur p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="font-bold text-2xl" style={{ color: primaryColor }}>${total.toFixed(2)}</p>
              </div>
              <button
                onClick={() => setStep(2)}
                className="px-6 py-4 text-black rounded-2xl font-bold flex items-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                Continuar <Send className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-bold mb-2">Tus datos</h2>
            <p className="text-sm text-gray-500 mb-6">El pedido se guarda en la app del vendedor al confirmar.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <User className="w-4 h-4" /> Nombre
                </label>
                <input
                  required
                  type="text"
                  placeholder="Juan Pérez"
                  className="w-full h-14 px-6 bg-white/5 border border-white/10 rounded-2xl focus:outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> WhatsApp
                </label>
                <input
                  required
                  type="tel"
                  placeholder="809 555 1234"
                  className="w-full h-14 px-6 bg-white/5 border border-white/10 rounded-2xl focus:outline-none"
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
                {submitting ? 'Registrando...' : 'Confirmar pedido'}
              </button>
            </form>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-bold mb-4">¡Pedido registrado!</h2>
            <p className="text-gray-400 mb-4 leading-relaxed">
              Gracias {formData.name}. Total: <strong className="text-white">${total.toFixed(2)}</strong>
            </p>
            {orderRef && (
              <p className="text-sm font-mono text-[#00D1FF] mb-2">Ref: #{orderRef}</p>
            )}
            <p className="text-xs text-gray-500 mb-8">
              Ya está en el sistema del vendedor (Inbox + Pedidos). Continúa por WhatsApp para hablar con ellos.
            </p>

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 w-full py-5 bg-[#25D366] text-white rounded-3xl font-bold text-lg hover:scale-[1.02] transition-transform mb-4"
              >
                <MessageCircle className="w-6 h-6" />
                Continuar en WhatsApp
              </a>
            ) : (
              <p className="text-yellow-400 text-sm mb-4">
                El vendedor aún no configuró WhatsApp. Te contactará pronto.
              </p>
            )}

            {trackingUrl && (
              <a href={trackingUrl} className="text-sm text-[#00D1FF] underline">
                Ver seguimiento del pedido
              </a>
            )}
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
