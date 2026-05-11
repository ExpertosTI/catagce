'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Send, User, Phone, CheckCircle2, AlertCircle, Box, ArrowLeft, Plus, Minus, Package, ArrowRight } from 'lucide-react';

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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    const slug = params.token;
    fetch(`${API_BASE}/api/catalogs/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error('Catalog not found');
        return r.json();
      })
      .then((data: Catalog) => {
        setCatalog(data);
        const initial: Record<string, number> = {};
        data.catalogProducts.forEach((cp) => { initial[cp.product.id] = 0; });
        setQuantities(initial);
      })
      .catch(() => setLoadError('Catálogo no encontrado o expirado.'));

    return () => window.removeEventListener('mousemove', handleMouseMove);
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
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 font-rajdhani">
        <div className="text-center space-y-6 glass p-12 rounded-[32px] max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-3xl font-bebas tracking-wide">ERROR DE ACCESO</h2>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">{loadError}</p>
          <button onClick={() => window.location.href = '/'} className="px-8 py-4 bg-white text-black font-bebas tracking-widest rounded-xl hover:bg-[#00D1FF] transition-all">
            VOLVER AL INICIO
          </button>
        </div>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-rajdhani">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-2 border-[#00D1FF]/20 border-t-[#00D1FF] rounded-full animate-spin" />
          <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">Sincronizando Catálogo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-hidden font-sans">
      {/* Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div 
          className="absolute inset-0 opacity-10 transition-opacity duration-1000"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 209, 255, 0.15), transparent 80%)`
          }}
        />
        <div className="absolute inset-0 grid-pattern opacity-5" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex items-center justify-between mb-16 glass p-6 rounded-[24px]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00D1FF] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,209,255,0.3)]">
              <Package className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bebas text-2xl tracking-wider leading-none">{catalog.name}</h1>
              <p className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">CATÁLOGO B2B ACTIVO</p>
            </div>
          </div>
          <div className="hidden sm:block font-rajdhani text-[9px] font-bold text-gray-600 uppercase tracking-[0.3em] border border-white/5 px-3 py-1 rounded-full bg-white/5">
            ID: {params.token.slice(0, 8)}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-end justify-between mb-10">
                <h2 className="text-4xl font-bebas tracking-wide">SELECCIONAR <span className="text-[#00D1FF]">PRODUCTOS</span></h2>
                <div className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">
                  {catalog.catalogProducts.length} DISPONIBLES
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                {catalog.catalogProducts.map((cp) => (
                  <motion.div
                    key={cp.id}
                    layout
                    className="group relative flex flex-col p-6 glass glass-hover rounded-[32px] transition-all"
                  >
                    <div className="flex gap-6 items-start mb-6">
                      <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                        <img
                          src={cp.product.imageUrl ?? 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200&auto=format&fit=crop'}
                          alt={cp.product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bebas text-xl tracking-wide group-hover:text-[#00D1FF] transition-colors">{cp.product.name}</h3>
                        <p className="font-rajdhani text-sm font-bold text-[#00D1FF] mt-1">${cp.product.basePrice}</p>
                        <p className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-widest">por {cp.product.baseUom?.symbol ?? 'un'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-black/40 rounded-2xl p-2 border border-white/5">
                      <button
                        onClick={() => setQuantities((q) => ({ ...q, [cp.product.id]: Math.max(0, (q[cp.product.id] ?? 0) - 1) }))}
                        className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors"
                      >
                        <Minus className="w-4 h-4 text-gray-400" />
                      </button>
                      <span className="font-bebas text-2xl w-12 text-center">
                        {quantities[cp.product.id] ?? 0}
                      </span>
                      <button
                        onClick={() => setQuantities((q) => ({ ...q, [cp.product.id]: (q[cp.product.id] ?? 0) + 1 }))}
                        className="w-10 h-10 rounded-xl bg-[#00D1FF]/10 text-[#00D1FF] flex items-center justify-center hover:bg-[#00D1FF] hover:text-black transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {selectedItems.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="sticky bottom-8 left-0 right-0 glass p-6 rounded-[32px] flex flex-col sm:flex-row justify-between items-center gap-6 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-[#00D1FF]/20"
                >
                  <div className="flex gap-8">
                    <div className="flex flex-col">
                      <span className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-widest">ITEMS</span>
                      <span className="font-bebas text-2xl">{selectedItems.length}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-widest text-[#00D1FF]">TOTAL</span>
                      <span className="font-bebas text-2xl text-[#00D1FF]">${total.toFixed(2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full sm:w-auto px-10 py-5 bg-[#00D1FF] text-black rounded-2xl font-bebas text-xl uppercase tracking-wider flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,209,255,0.3)]"
                  >
                    CONTINUAR <ArrowRight className="w-6 h-6" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }}
              className="max-w-xl mx-auto"
            >
              <button 
                onClick={() => setStep(1)}
                className="flex items-center gap-2 font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors mb-10"
              >
                <ArrowLeft className="w-4 h-4" /> VOLVER A PRODUCTOS
              </button>

              <h2 className="text-5xl font-bebas tracking-wide mb-10">DATOS DE <span className="text-[#00D1FF]">CONTACTO</span></h2>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <label className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2 ml-2">
                    <User className="w-3 h-3 text-[#00D1FF]" /> NOMBRE COMPLETO
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="EJ: JUAN PÉREZ"
                    className="w-full h-16 px-6 bg-white/5 border border-white/10 rounded-2xl font-bebas text-xl tracking-widest focus:border-[#00D1FF] focus:outline-none focus:bg-white/[0.08] transition-all placeholder:text-white/10"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-3">
                  <label className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2 ml-2">
                    <Phone className="w-3 h-3 text-[#00D1FF]" /> WHATSAPP
                  </label>
                  <input
                    required
                    type="tel"
                    placeholder="+1 (809) 000-0000"
                    className="w-full h-16 px-6 bg-white/5 border border-white/10 rounded-2xl font-bebas text-xl tracking-widest focus:border-[#00D1FF] focus:outline-none focus:bg-white/[0.08] transition-all placeholder:text-white/10"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="glass p-6 rounded-2xl border-white/5 space-y-4">
                  <div className="flex justify-between font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>RESUMEN DEL PEDIDO</span>
                    <span>{selectedItems.length} ITEMS</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bebas text-3xl">TOTAL A PAGAR</span>
                    <span className="font-bebas text-4xl text-[#00D1FF]">${total.toFixed(2)}</span>
                  </div>
                </div>

                {submitError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 font-rajdhani text-xs font-bold uppercase tracking-widest">
                    <AlertCircle className="w-4 h-4" /> {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-6 bg-[#00D1FF] text-black rounded-2xl font-bebas text-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_15px_40px_rgba(0,209,255,0.3)]"
                >
                  {submitting ? 'PROCESANDO...' : 'CONFIRMAR PEDIDO'}
                </button>
              </form>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20 glass rounded-[40px] border-[#00D1FF]/20"
            >
              <div className="relative w-24 h-24 bg-[#00D1FF]/10 text-[#00D1FF] rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(0,209,255,0.2)]">
                <div className="absolute inset-0 rounded-full border border-[#00D1FF] animate-ping opacity-20" />
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-6xl font-bebas tracking-wide mb-4">PEDIDO <span className="text-[#00D1FF]">EXITOSO</span></h2>
              <p className="font-rajdhani text-gray-500 font-bold uppercase tracking-[0.2em] max-w-sm mx-auto mb-12">
                Gracias {formData.name.split(' ')[0]}, el sistema ha registrado tu solicitud. Un agente de ventas te contactará por WhatsApp en breve.
              </p>
              <button
                onClick={() => window.location.href = '/'}
                className="px-12 py-5 bg-white/5 border border-white/10 rounded-2xl font-bebas text-xl tracking-widest text-white hover:bg-white hover:text-black transition-all"
              >
                CERRAR SESIÓN
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
