'use client';

import { motion } from 'framer-motion';
import { StatCard } from './Cards';
import { 
  DollarSign, ShoppingCart, Box, TrendingUp, 
  Package, ChevronRight, User 
} from 'lucide-react';

export function HomeView({ products, orders, loading, color, onCreate, onExportPdf }: any) {
  const totalSales = orders.reduce((acc: number, o: any) => acc + (Number(o.totalAmount) || 0), 0);
  const pendingOrders = orders.filter((o: any) => o.status === 'submitted').length;

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <p className="font-rajdhani text-xs font-bold text-gray-500 uppercase tracking-[0.4em]">OVERVIEW</p>
          <h2 className="text-6xl font-bebas tracking-wide uppercase leading-none">CORE <span style={{ color }}>PERFORMANCE</span></h2>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={onExportPdf}
            className="px-6 py-3 glass rounded-xl font-rajdhani text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
          >
            EXPORTAR REPORTES
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="TOTAL VENTAS" value={`$${totalSales.toLocaleString()}`} change="+12.5%" trend="up" icon={<DollarSign className="w-6 h-6 text-gray-700" />} />
        <StatCard title="ÓRDENES TOTALES" value={orders.length} change="+4.2%" trend="up" icon={<ShoppingCart className="w-6 h-6 text-gray-700" />} />
        <StatCard title="PEDIDOS PENDIENTES" value={pendingOrders} change="-2" trend="down" icon={<Package className="w-6 h-6 text-gray-700" />} />
        <StatCard title="CONVERSIÓN" value="3.8%" change="+0.4%" trend="up" icon={<TrendingUp className="w-6 h-6 text-gray-700" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
           <div className="flex justify-between items-center">
             <h3 className="font-bebas text-3xl uppercase tracking-wider">ÚLTIMOS PEDIDOS</h3>
             <button className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white">VER TODO</button>
           </div>
           <div className="space-y-4">
              {orders.slice(0, 5).map((o: any) => (
                <div key={o.id} className="glass p-6 rounded-[32px] flex items-center justify-between group hover:border-white/20 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-bebas text-xl uppercase tracking-wide">{o.buyerName}</p>
                      <p className="font-rajdhani text-[8px] font-bold text-gray-600 uppercase tracking-widest">{o.buyerPhone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bebas text-xl" style={{ color }}>${o.totalAmount}</p>
                    <p className="font-rajdhani text-[8px] font-bold text-gray-600 uppercase tracking-widest">{o.status}</p>
                  </div>
                </div>
              ))}
           </div>
        </div>

        <div className="space-y-8">
           <h3 className="font-bebas text-3xl uppercase tracking-wider">TOP PRODUCTOS</h3>
           <div className="space-y-6">
             {products.slice(0, 3).map((p: any) => (
               <div key={p.id} className="flex items-center gap-4 group cursor-pointer">
                 <div className="w-16 h-16 rounded-2xl overflow-hidden glass p-1">
                   <img src={p.imageUrl || 'https://via.placeholder.com/150'} className="w-full h-full object-cover rounded-xl" />
                 </div>
                 <div className="flex-1">
                   <p className="font-bebas text-lg uppercase tracking-wide group-hover:text-white transition-colors">{p.name}</p>
                   <p className="font-rajdhani text-[10px] font-bold text-gray-600 uppercase tracking-widest">${p.basePrice} · SKU: {p.sku}</p>
                 </div>
                 <ChevronRight className="w-5 h-5 text-gray-800 group-hover:translate-x-1 transition-transform" />
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
