'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import {
  Box, Zap, ArrowRight, ShieldCheck, Smartphone, BarChart3, MessageCircle, Layers,
} from 'lucide-react';

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen bg-[#050508] text-white selection:bg-[#00D1FF]/30 font-sans overflow-x-hidden">
      {/* Deep ambient layers */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#00D1FF]/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-[#FF8A00]/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_60%,transparent_100%)]" />
      </div>

      <header className="relative z-20 flex items-center justify-between px-6 md:px-10 py-6 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 bg-[#00D1FF] rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(0,209,255,0.4)] group-hover:rotate-6 transition-transform">
            <Box className="text-black w-6 h-6" />
          </div>
          <span className="text-xl font-black tracking-tighter">CATAGCE<span className="text-[#00D1FF]">.</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-gray-500">
          <a href="#features" className="hover:text-[#00D1FF] transition-colors">Funciones</a>
          <a href="#vision" className="hover:text-[#00D1FF] transition-colors">Visión</a>
        </nav>
        <Link
          href="/register"
          className="px-5 py-2.5 bg-[#00D1FF] text-black rounded-xl font-black text-sm uppercase tracking-wide hover:shadow-[0_0_40px_rgba(0,209,255,0.5)] hover:-translate-y-0.5 transition-all"
        >
          Empezar gratis
        </Link>
      </header>

      <main ref={heroRef} className="relative z-10">
        {/* Hero */}
        <section className="px-6 md:px-10 pt-16 pb-32 max-w-7xl mx-auto">
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 text-[10px] font-black uppercase tracking-[0.2em] text-[#00D1FF] border border-[#00D1FF]/25 rounded-full bg-[#00D1FF]/5"
              >
                <span className="w-2 h-2 bg-[#00D1FF] rounded-full animate-pulse" />
                Potenciado por Renace.tech
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl md:text-7xl xl:text-8xl font-black tracking-tighter leading-[0.9] mb-8"
              >
                VENDE
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-[#00D1FF] to-gray-500">
                  MÁS RÁPIDO.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-lg md:text-xl text-gray-400 mb-10 max-w-lg leading-relaxed"
              >
                Catálogos interactivos para WhatsApp, inventario en vivo y pedidos B2B sin fricción.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link
                  href="/register"
                  className="group px-8 py-4 bg-[#00D1FF] text-black rounded-xl font-black text-lg flex items-center justify-center gap-2 hover:shadow-[0_8px_40px_rgba(0,209,255,0.45)] hover:-translate-y-1 transition-all"
                >
                  Crear catálogo <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/login" className="px-8 py-4 border border-white/15 rounded-xl font-bold text-gray-400 hover:text-white hover:border-white/30 transition-all text-center">
                  Iniciar sesión
                </Link>
              </motion.div>
            </div>

            {/* Hero visual — layered depth */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, duration: 0.7 }}
              className="relative hidden lg:block h-[480px]"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00D1FF]/20 to-transparent rounded-3xl blur-3xl" />
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-8 left-8 right-8 bottom-24 rounded-2xl border border-white/15 bg-[#0d0d12]/90 backdrop-blur-xl p-6 shadow-2xl"
              >
                <div className="flex items-center gap-2 mb-6">
                  <MessageCircle className="w-5 h-5 text-[#00D1FF]" />
                  <span className="text-sm font-bold">Pedido WhatsApp</span>
                </div>
                <div className="space-y-3">
                  {['Camiseta polo × 12', 'Catálogo Mayorista 2026', 'Total: RD$18,400'].map((line, i) => (
                    <div key={line} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className={`w-2 h-2 rounded-full ${i === 2 ? 'bg-[#00D1FF]' : 'bg-gray-600'}`} />
                      <span className={i === 2 ? 'text-[#00D1FF] font-bold' : 'text-gray-300 text-sm'}>{line}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute bottom-4 right-4 w-48 p-4 rounded-xl border border-[#FF8A00]/30 bg-[#FF8A00]/10 backdrop-blur-lg"
              >
                <BarChart3 className="w-6 h-6 text-[#FF8A00] mb-2" />
                <p className="text-2xl font-black">+38%</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">conversión</p>
              </motion.div>
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute top-4 right-12 w-40 p-3 rounded-xl border border-white/10 bg-black/60 backdrop-blur-lg"
              >
                <Layers className="w-5 h-5 text-[#00D1FF] mb-1" />
                <p className="text-xs text-gray-400">Stock sincronizado</p>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* Features — elevated cards */}
        <section id="features" className="px-6 md:px-10 py-24 max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-black tracking-tighter text-center mb-16"
          >
            Todo lo que tu negocio B2B necesita
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard icon={<Smartphone className="w-8 h-8" />} title="WhatsApp First" desc="Tus clientes compran en 2 clics desde WhatsApp. Sin apps, sin registros." delay={0} />
            <FeatureCard icon={<BarChart3 className="w-8 h-8" />} title="Analítica Live" desc="Sabe cuándo abren tu catálogo y cierra ventas en el momento justo." delay={0.1} />
            <FeatureCard icon={<ShieldCheck className="w-8 h-8" />} title="Control Total" desc="Inventario por unidad, caja o docena. Nunca más digas 'no hay' después del pedido." delay={0.2} />
          </div>
        </section>

        {/* Vision */}
        <section id="vision" className="px-6 md:px-10 py-32 max-w-7xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00D1FF]/10 via-transparent to-[#FF8A00]/10" />
            <div className="relative p-12 md:p-20 text-center">
              <Zap className="w-12 h-12 text-[#00D1FF] mx-auto mb-8" />
              <h2 className="text-2xl md:text-4xl font-black tracking-tighter max-w-3xl mx-auto leading-tight">
                No es solo un catálogo. Es el sistema operativo de tu negocio B2B.
              </h2>
              <div className="flex flex-wrap justify-center gap-12 mt-12">
                {[
                  { v: '100%', l: 'Seguro' },
                  { v: '0.5s', l: 'Velocidad' },
                  { v: '24/7', l: 'Soporte' },
                ].map((s) => (
                  <div key={s.l} className="text-center">
                    <p className="text-3xl font-black text-[#00D1FF]">{s.v}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">{s.l}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/register"
                className="inline-flex mt-12 px-8 py-4 bg-white text-black rounded-xl font-black hover:bg-[#00D1FF] transition-colors"
              >
                Empezar ahora — es gratis
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-16 px-6 md:px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-[#00D1FF]" />
            <span className="font-black tracking-tighter">CATAGCE</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">
            © 2026 Renace.tech · República Dominicana
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon, title, desc, delay,
}: { icon: React.ReactNode; title: string; desc: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className="group relative p-8 rounded-2xl border border-white/10 bg-[#0c0c10]/80 backdrop-blur-sm hover:border-[#00D1FF]/30 hover:shadow-[0_20px_60px_rgba(0,209,255,0.12)] transition-all"
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#00D1FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="text-[#00D1FF] mb-6 group-hover:scale-110 transition-transform origin-left">{icon}</div>
        <h3 className="text-xl font-black tracking-tight mb-3 uppercase">{title}</h3>
        <p className="text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}
