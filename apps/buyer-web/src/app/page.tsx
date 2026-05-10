'use client';

import { motion } from 'framer-motion';
import { ShoppingBag, Box, Zap, ArrowRight, ShieldCheck, Globe, Smartphone, BarChart3 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#00D1FF]/30 font-sans">
      {/* Background Grid Accent */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-8 mx-auto max-w-7xl border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-10 h-10 bg-[#00D1FF] rounded-lg flex items-center justify-center transition-transform group-hover:rotate-12">
            <Box className="text-black w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tighter">CATAGCE<span className="text-[#00D1FF]">.</span></span>
        </div>
        <nav className="hidden md:flex items-center gap-10 text-xs font-bold uppercase tracking-widest text-gray-500">
          <a href="#features" className="hover:text-white transition-colors">Funciones</a>
          <a href="#about" className="hover:text-white transition-colors">Visión</a>
          <a href="#" className="hover:text-white transition-colors">Precios</a>
        </nav>
        <button className="px-6 py-3 bg-white text-black rounded-lg font-black text-sm uppercase tracking-wider hover:bg-[#00D1FF] transition-all hover:translate-x-1 hover:-translate-y-1 shadow-[4px_4px_0px_#00D1FF]">
          Entrar
        </button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 px-8 pt-24 pb-40 mx-auto max-w-7xl">
        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 text-[10px] font-black uppercase tracking-[0.2em] text-[#00D1FF] border border-[#00D1FF]/20 rounded-md bg-[#00D1FF]/5">
              <span className="w-2 h-2 bg-[#00D1FF] rounded-full animate-pulse" />
              Potenciado por Renace.tech
            </div>
            
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.85] mb-12">
              VENDE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-500">
                MÁS RÁPIDO.
              </span>
            </h1>

            <p className="max-w-2xl text-xl md:text-2xl text-gray-400 mb-16 leading-tight font-medium">
              Transforma tu inventario en un canal de ventas imparable. 
              Catálogos interactivos para WhatsApp, analítica en tiempo real y pedidos sin fricción.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <button className="group w-full sm:w-auto px-10 py-5 bg-[#00D1FF] text-black rounded-xl font-black text-xl uppercase tracking-tighter flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-[8px_8px_0px_white]">
                Crear Catálogo <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-4 text-gray-500 font-bold uppercase text-sm tracking-widest cursor-pointer hover:text-white transition-colors">
                Ver Demo <div className="w-10 h-[2px] bg-gray-700" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Feature Blocks - Brutalist Style */}
        <div id="features" className="mt-40 grid grid-cols-1 md:grid-cols-3 gap-1px bg-white/10 border border-white/10 rounded-3xl overflow-hidden">
          <FeatureCard 
            icon={<Smartphone className="w-8 h-8" />}
            title="WhatsApp First"
            desc="Tus clientes compran en 2 clics directamente desde WhatsApp. Sin descargas, sin registros."
          />
          <FeatureCard 
            icon={<BarChart3 className="w-8 h-8" />}
            title="Analítica Live"
            desc="Sabes exactamente cuándo un cliente abre tu catálogo. Cierra ventas en el momento justo."
          />
          <FeatureCard 
            icon={<ShieldCheck className="w-8 h-8" />}
            title="Control Total"
            desc="Inventario sincronizado por unidad, caja o docena. Nunca más digas 'no hay' después del pedido."
          />
        </div>

        {/* Vision Statement */}
        <section id="about" className="mt-40 text-center">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-10 max-w-3xl mx-auto">
            "NO ES SOLO UN CATÁLOGO. ES EL SISTEMA OPERATIVO DE TU NEGOCIO B2B."
          </h2>
          <div className="flex justify-center gap-12 text-gray-500 font-bold uppercase tracking-widest text-xs">
            <div className="flex flex-col items-center gap-2">
              <span className="text-white text-2xl tracking-tighter">100%</span>
              Seguro
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-white text-2xl tracking-tighter">0.5s</span>
              Velocidad
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-white text-2xl tracking-tighter">24/7</span>
              Soporte
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-20 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Box className="w-6 h-6 text-[#00D1FF]" />
              <span className="text-xl font-black tracking-tighter">CATAGCE</span>
            </div>
            <p className="text-gray-500 max-w-xs text-sm font-medium">
              Reinventando la forma en que los mayoristas venden y gestionan sus pedidos en la era digital.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-20">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white mb-6">Producto</h4>
              <ul className="space-y-4 text-sm text-gray-500 font-bold">
                <li className="hover:text-[#00D1FF] cursor-pointer">Catálogos</li>
                <li className="hover:text-[#00D1FF] cursor-pointer">Inventario</li>
                <li className="hover:text-[#00D1FF] cursor-pointer">Pedidos</li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white mb-6">Legal</h4>
              <ul className="space-y-4 text-sm text-gray-500 font-bold">
                <li className="hover:text-[#00D1FF] cursor-pointer">Privacidad</li>
                <li className="hover:text-[#00D1FF] cursor-pointer">Términos</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-700">
          <span>© 2026 RENACETECH</span>
          <span>DOMINICAN REPUBLIC</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-12 bg-[#111111] hover:bg-[#161616] transition-colors group">
      <div className="text-[#00D1FF] mb-8 group-hover:scale-110 transition-transform origin-left">
        {icon}
      </div>
      <h3 className="text-2xl font-black tracking-tighter mb-4 uppercase">{title}</h3>
      <p className="text-gray-500 leading-tight font-medium text-lg">
        {desc}
      </p>
    </div>
  );
}
