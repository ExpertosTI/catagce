'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { 
  Package, ChevronRight, ArrowLeft, X, Plus, 
  ExternalLink, Share2, ClipboardCheck 
} from 'lucide-react';

export function CatalogsView({ 
  catalogs, products, loading, selected, color, 
  onSelect, onClose, onDelete, onOrder, onShare, onCreate, onAddProduct 
}: any) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <h2 className="text-6xl font-bebas tracking-wide uppercase">CATÁLOGOS <span style={{ color }}>ACTIVOS</span></h2>
        <button 
          onClick={onCreate}
          className="w-14 h-14 rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-[0_0_20px_rgba(0,209,255,0.4)]"
          style={{ backgroundColor: color }}
        >
          <Plus className="w-8 h-8 text-black" />
        </button>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 glass rounded-[32px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {catalogs.map((cat: any) => (
            <motion.div
              key={cat.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => onSelect(cat)}
              className="group glass glass-hover p-8 rounded-[40px] flex items-center gap-6 cursor-pointer"
            >
              <div 
                className="w-20 h-20 rounded-[28px] flex items-center justify-center group-hover:text-black transition-all"
                style={{ backgroundColor: `${color}11` }}
              >
                <Package className="w-10 h-10" style={{ color }} />
              </div>
              <div className="flex-1">
                <h3 className="text-3xl font-bebas tracking-wide uppercase">{cat.name}</h3>
                <p className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {cat.catalogProducts?.length ?? 0} ITEMS · /{cat.slug}
                </p>
              </div>
              <ChevronRight className="w-8 h-8 text-gray-800 group-hover:translate-x-2 transition-transform" />
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] glass backdrop-blur-3xl p-6 md:p-12 overflow-y-auto"
          >
            <div className="max-w-6xl mx-auto">
              <header className="flex justify-between items-start mb-16">
                <div>
                  <button onClick={onClose} className="flex items-center gap-2 font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white mb-6">
                    <ArrowLeft className="w-4 h-4" /> VOLVER A CATÁLOGOS
                  </button>
                  <h2 className="text-7xl font-bebas tracking-tight uppercase leading-none">{selected.name}</h2>
                  <p className="font-rajdhani text-xs font-bold uppercase tracking-[0.4em] mt-2" style={{ color }}>CONFIGURACIÓN DE CATÁLOGO PRIVADO</p>
                </div>
                <button onClick={onClose} className="w-16 h-16 glass rounded-full flex items-center justify-center hover:bg-red-500/20 transition-all">
                  <X className="w-8 h-8" />
                </button>
              </header>

              <div className="flex justify-between items-center mb-6">
                <p className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest">{(selected.catalogProducts ?? []).length} PRODUCTOS EN ESTE CATÁLOGO</p>
                <button onClick={() => setPickerOpen(true)} className="px-5 py-3 rounded-xl font-bebas text-sm tracking-widest uppercase flex items-center gap-2" style={{ backgroundColor: color, color: '#000' }}>
                  <Plus className="w-4 h-4" /> AÑADIR PRODUCTO
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="md:col-span-2 space-y-6">
                   {(selected.catalogProducts ?? []).map((cp: any) => (
                     <div key={cp.productId} className="glass p-6 rounded-[32px] flex items-center gap-6 group hover:border-white/20 transition-all">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden glass p-1">
                          <img src={cp.product?.imageUrl || 'https://via.placeholder.com/150'} className="w-full h-full object-cover rounded-xl" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bebas text-2xl uppercase tracking-wide">{cp.product?.name}</h4>
                          <p className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-widest">${cp.product?.basePrice} · SKU: {cp.product?.sku}</p>
                        </div>
                        <button className="w-12 h-12 glass rounded-full flex items-center justify-center hover:bg-red-500/20 transition-all">
                           <X className="w-5 h-5 text-gray-600" />
                        </button>
                     </div>
                   ))}
                </div>

                <div className="space-y-6">
                   <div className="glass p-10 rounded-[40px] space-y-8">
                      <h5 className="font-bebas text-3xl uppercase tracking-widest">CONTROL DE ACCESO</h5>
                      <div className="space-y-4">
                        <button onClick={() => onOrder(selected.slug)} className="w-full py-5 bg-white text-black rounded-2xl font-bebas text-xl tracking-widest uppercase flex items-center justify-center gap-3 hover:scale-105 transition-all">
                          <ExternalLink className="w-5 h-5" /> VER VISTA PÚBLICA
                        </button>
                        <button onClick={() => onShare(selected.slug)} className="w-full py-5 glass border-white/10 rounded-2xl font-bebas text-xl tracking-widest uppercase flex items-center justify-center gap-3 hover:bg-white/5 transition-all">
                          <Share2 className="w-5 h-5" /> COPIAR ENLACE
                        </button>
                        <button 
                           onClick={onDelete}
                           className="w-full py-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-bebas text-xl tracking-widest uppercase flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all"
                        >
                          <X className="w-5 h-5" /> ELIMINAR CATÁLOGO
                        </button>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pickerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setPickerOpen(false)} />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative glass p-10 rounded-[40px] w-full max-w-lg space-y-8 max-h-[80vh] overflow-y-auto">
              <h3 className="text-4xl font-bebas tracking-widest uppercase">ELEGIR PRODUCTO</h3>
              <div className="space-y-4">
                {products.map((p: any) => (
                  <div 
                    key={p.id} 
                    onClick={() => { onAddProduct(selected.id, p.id); setPickerOpen(false); }}
                    className="glass p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden">
                      <img src={p.imageUrl || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-bebas text-lg uppercase tracking-wide">{p.name}</p>
                      <p className="font-rajdhani text-[10px] text-gray-500 uppercase tracking-widest">${p.basePrice}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
