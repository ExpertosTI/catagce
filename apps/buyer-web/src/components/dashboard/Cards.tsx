'use client';

import { motion } from 'framer-motion';
import { 
  DollarSign, ShoppingCart, Box, ArrowRight, 
  MessageSquare, Edit2, X, Camera 
} from 'lucide-react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&auto=format&fit=crop';

export function StatCard({ title, value, change, trend, icon }: any) {
  return (
    <div className="glass p-8 rounded-[40px] relative overflow-hidden group">
      <div className="flex justify-between items-start mb-6">
        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500">
          {icon}
        </div>
        {change && (
          <span className={`font-rajdhani text-[10px] font-black px-3 py-1 rounded-full border ${
            trend === 'up' ? 'text-green-400 border-green-500/20 bg-green-500/5' : 'text-red-400 border-red-500/20 bg-red-500/5'
          }`}>
            {change}
          </span>
        )}
      </div>
      <p className="font-bebas text-4xl mb-1 tracking-tight">{value}</p>
      <p className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-widest">{title}</p>
    </div>
  );
}

export function ProductCard({ product, color, onDelete }: { product: any; color: string; onDelete?: any }) {
  const stock = product.stockLevels?.[0]?.onHandBase ?? 0;
  return (
    <motion.div whileHover={{ y: -4 }} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden group">
      <div className="aspect-[4/3] relative overflow-hidden bg-gray-50">
        <img 
          src={product.imageUrl || FALLBACK_IMG} 
          alt={product.name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
        />
      </div>
      <div className="p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-1 truncate">{product.name}</h3>
        <p className="text-lg font-black text-gray-900 mb-4">${product.basePrice}</p>
        
        <div className="flex items-center justify-between">
           <p className="text-[10px] font-bold text-gray-400">
             <span className="text-green-500">{stock} disponibles</span>
           </p>
           <div className="flex gap-2">
             <button 
               onClick={onDelete}
               className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
             >
                <X className="w-4 h-4" />
             </button>
             <button className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-black transition-colors">
                <Edit2 className="w-4 h-4" />
             </button>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

export function SkeletonCard() {
  return <div className="aspect-[3/4] glass rounded-[32px] animate-pulse" />;
}
