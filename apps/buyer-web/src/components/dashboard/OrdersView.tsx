'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { User, ShoppingCart } from 'lucide-react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&auto=format&fit=crop';

export function OrdersView({ orders, loading, color, onUpdateStatus }: any) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <h2 className="text-6xl font-bebas tracking-wide uppercase">GESTIÓN DE <span style={{ color }}>PEDIDOS</span></h2>
        <span className="font-bebas text-2xl text-gray-700">{orders.length} TOTAL</span>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 glass rounded-[32px] animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-6">
          <ShoppingCart className="w-12 h-12 text-gray-800" />
          <p className="font-rajdhani text-[10px] font-bold text-gray-600 uppercase tracking-[0.4em]">SIN PEDIDOS PENDIENTES</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <div key={order.id} className="space-y-4">
              <div 
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                className="glass p-8 rounded-[32px] flex flex-col md:flex-row justify-between items-center gap-6 border-white/5 hover:border-white/20 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center">
                    <User className="text-gray-500" />
                  </div>
                  <div>
                    <p className="font-bebas text-2xl uppercase tracking-wide">{order.buyerName}</p>
                    <p className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-widest">{order.buyerPhone}</p>
                  </div>
                </div>
                
                <div className="flex-1 flex justify-center gap-12">
                  <div className="text-center">
                    <p className="font-rajdhani text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">MONTO</p>
                    <p className="font-bebas text-2xl" style={{ color }}>${order.totalAmount}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-rajdhani text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">ESTADO</p>
                    <span 
                      className="px-3 py-1 rounded-full font-rajdhani text-[9px] font-bold uppercase tracking-widest border"
                      style={{ backgroundColor: `${color}11`, color, borderColor: `${color}22` }}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  {order.status === 'submitted' && (
                    <>
                      <button onClick={() => onUpdateStatus(order.id, 'confirmed')} className="px-5 py-3 rounded-xl font-bebas text-sm tracking-widest uppercase bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500 hover:text-black transition-all">
                        CONFIRMAR
                      </button>
                      <button onClick={() => onUpdateStatus(order.id, 'rejected')} className="px-5 py-3 rounded-xl font-bebas text-sm tracking-widest uppercase bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all">
                        RECHAZAR
                      </button>
                    </>
                  )}
                  {order.status === 'confirmed' && (
                    <button onClick={() => onUpdateStatus(order.id, 'shipped')} className="px-5 py-3 rounded-xl font-bebas text-sm tracking-widest uppercase bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white transition-all">
                      MARCAR ENVIADO
                    </button>
                  )}
                  {order.status === 'shipped' && (
                    <button onClick={() => onUpdateStatus(order.id, 'delivered')} className="px-5 py-3 rounded-xl font-bebas text-sm tracking-widest uppercase bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all">
                      ENTREGADO
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expandedOrder === order.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-white/5 rounded-[32px] p-8 border border-white/10 mx-4"
                  >
                    <p className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">DETALLE DE PRODUCTOS</p>
                    <div className="space-y-4">
                      {order.orderItems?.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center border-b border-white/5 pb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden">
                              <img src={item.product?.imageUrl || FALLBACK_IMG} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="font-bebas text-lg uppercase">{item.product?.name || 'Producto'}</p>
                              <p className="font-rajdhani text-[10px] text-gray-500">CANTIDAD: {item.quantity}</p>
                            </div>
                          </div>
                          <p className="font-bebas text-xl">${item.unitPrice * item.quantity}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
