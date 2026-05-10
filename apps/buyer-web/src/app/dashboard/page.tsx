'use client';

import { motion } from 'framer-motion';
import { Search, User, Plus, Package, FileText, LayoutGrid, Settings, Home, FileOutput } from 'lucide-react';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/products`, {
          headers: {
            'x-seller-id': 'demo-seller-id' // En producción esto vendría del login
          }
        });
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">Cargando productos...</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-24">
      {/* Top Bar */}
      <header className="flex items-center justify-between p-6 md:px-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00D1FF] rounded-lg flex items-center justify-center">
            <Package className="text-black w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Catálogo<span className="text-[#00D1FF]">Pro</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <Search className="w-6 h-6 text-gray-400" />
          </button>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
            <User className="w-6 h-6 text-gray-400" />
          </div>
        </div>
      </header>

      <main className="px-6 md:px-12">
        <h2 className="text-2xl font-bold mb-8">Productos</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {products.map((product) => (
            <motion.div 
              key={product.id}
              whileHover={{ y: -5 }}
              className="group relative bg-[#121212] rounded-[2.5rem] overflow-hidden border border-white/5"
            >
              <div className="aspect-[4/3] relative">
                <img src={product.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop'} alt={product.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                {/* Product Name Overlay */}
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="text-xl font-bold">
                    {product.name?.split(' - ')[0]} {product.name?.split(' - ')[1] && <span className="text-[#00D1FF]">- {product.name.split(' - ')[1]}</span>}
                  </h3>
                </div>
              </div>

              {/* Product Info Section (Bottom part of card in Image 1) */}
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="flex items-center gap-2 text-[#00D1FF] text-xs font-bold uppercase mb-2">
                      <span className="w-1.5 h-1.5 bg-[#00D1FF] rounded-full animate-pulse" />
                      {product.views || 42} Vistas Live
                    </div>
                    <p className="text-2xl font-bold mb-1">${product.basePrice} USD</p>
                    <p className="text-gray-400 font-medium">STOCK: {product.stockLevels?.[0]?.onHandBase || 0} un</p>
                  </div>
                  <div className="text-right flex gap-3 text-xs text-gray-500 font-mono">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 bg-white/5 rounded-md flex items-center justify-center mb-1">
                        <LayoutGrid className="w-3 h-3" />
                      </div>
                      <span>Cajas: {Math.floor((product.stockLevels?.[0]?.onHandBase || 0) / 12)}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 bg-white/5 rounded-md flex items-center justify-center mb-1">
                        <LayoutGrid className="w-3 h-3" />
                      </div>
                      <span>Docenas: {Math.floor((product.stockLevels?.[0]?.onHandBase || 0) / 12)}</span>
                    </div>
                  </div>
                </div>

                <button className="w-full py-4 bg-[#00D1FF] text-black font-bold rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,209,255,0.3)] hover:scale-[1.02] transition-transform">
                  <Plus className="w-5 h-5" /> Añadir Stock
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Export to PDF Button */}
        <div className="mt-8">
          <button className="flex items-center gap-3 bg-gradient-to-r from-[#FF8A00] to-[#FF5C00] px-6 py-4 rounded-2xl font-bold shadow-lg hover:scale-105 transition-transform">
            <FileText className="w-6 h-6" /> Exportar a PDF
          </button>
        </div>
      </main>

      {/* Floating Action Button */}
      <button className="fixed bottom-32 right-8 w-20 h-20 bg-gradient-to-br from-[#FF8A00] to-[#FF5C00] rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(255,138,0,0.4)] hover:scale-110 transition-transform z-50">
        <Plus className="w-10 h-10 text-white" />
        <span className="absolute -bottom-8 right-0 text-xs font-bold text-gray-400 whitespace-nowrap">Nuevo Producto</span>
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 p-6 z-40">
        <div className="max-w-xl mx-auto bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] px-8 py-4 flex justify-between items-center shadow-2xl">
          <NavItem icon={<Home className="w-6 h-6" />} label="Inicio" active />
          <NavItem icon={<LayoutGrid className="w-6 h-6" />} label="Productos" />
          <NavItem icon={<Package className="w-6 h-6" />} label="Catálogos" />
          <NavItem icon={<FileOutput className="w-6 h-6" />} label="Pedidos" />
          <NavItem icon={<Settings className="w-6 h-6" />} label="Configuración" />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-[#FF8A00]' : 'text-gray-500 hover:text-white'}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
