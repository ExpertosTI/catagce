'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Send, User, Phone, CheckCircle2 } from 'lucide-react';

export default function OrderPage({ params }: { params: { token: string } }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', phone: '' });

  const products = [
    { id: '1', name: 'Premium Leather Boots', price: 120, unit: 'Pair', image: 'https://images.unsplash.com/photo-1520639889313-7272175b1c39?q=80&w=200&auto=format&fit=crop' },
    { id: '2', name: 'Classic Canvas Sneaker', price: 85, unit: 'Pair', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200&auto=format&fit=crop' },
  ];

  const handleNext = () => setStep(2);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          token: params.token,
        }),
      });
      if (response.ok) {
        setStep(3);
      }
    } catch (error) {
      console.error('Order failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <ShoppingCart className="text-black w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl">Pedido Rápido</h1>
          </div>
          <div className="text-sm text-gray-500 font-mono">TOKEN: {params.token.slice(0, 8)}</div>
        </header>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-bold mb-6 text-balance">Revisa tu selección</h2>
            <div className="space-y-4 mb-10">
              {products.map((product) => (
                <div key={product.id} className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10">
                  <img src={product.image} alt={product.name} className="w-16 h-16 rounded-2xl object-cover" />
                  <div className="flex-1">
                    <h3 className="font-bold">{product.name}</h3>
                    <p className="text-sm text-gray-400">{product.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${product.price}</p>
                    <p className="text-xs text-gray-500">Cant: 1</p>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={handleNext}
              className="w-full py-5 bg-white text-black rounded-3xl font-bold text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
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
              <button 
                type="submit"
                className="w-full py-5 bg-blue-600 text-white rounded-3xl font-bold text-lg hover:bg-blue-700 transition-colors"
              >
                Realizar Pedido
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
              Gracias {formData.name}, hemos recibido tu pedido. <br />
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
