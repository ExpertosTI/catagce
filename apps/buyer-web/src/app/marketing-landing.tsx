'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, ArrowRight, ShieldCheck, Smartphone, BarChart3, ChevronRight, Play, X, LogIn, Mail, Lock, Zap } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function MarketingLanding({ host }: { host?: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Auth state for the integrated form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (!res.ok) throw new Error('Unauthorized');
      const { token } = await res.json();
      localStorage.setItem('catagce_token', token);
      window.location.reload(); // Refresh to enter dashboard
    } catch {
      setLoginError('CREDENCIALES INVÁLIDAS');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-white selection:bg-[#00D1FF]/30 overflow-hidden font-sans selection:text-black">
      <AnimatePresence>
        {!isLoaded && <LoadingScreen />}
      </AnimatePresence>

      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div 
          className="absolute inset-0 opacity-20 transition-opacity duration-1000"
          style={{
            background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 209, 255, 0.15), transparent 80%)`
          }}
        />
        <div className="absolute inset-0 grid-pattern opacity-10" />
      </div>

      <Particles count={30} />

      {/* HEADER */}
      <header className="relative z-50 flex items-center justify-between px-6 py-6 mx-auto max-w-7xl backdrop-blur-md border-b border-white/5">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 group cursor-pointer"
        >
          <div className="relative w-10 h-10 bg-[#00D1FF] rounded-xl flex items-center justify-center transition-transform group-hover:rotate-[15deg] shadow-[0_0_20px_rgba(0,209,255,0.4)]">
            <Box className="text-black w-6 h-6" />
          </div>
          <span className="text-2xl font-bebas tracking-wider uppercase">CATAGCE<span className="text-[#00D1FF]">.</span></span>
        </motion.div>

        <nav className="hidden lg:flex items-center gap-10 font-rajdhani text-[11px] font-bold uppercase tracking-[0.3em] text-gray-500">
          <a href="#features" className="hover:text-[#00D1FF] transition-all hover:tracking-[0.4em]">Funciones</a>
          <a href="#vision" className="hover:text-[#00D1FF] transition-all hover:tracking-[0.4em]">Visión</a>
          <a href="#" className="hover:text-[#00D1FF] transition-all hover:tracking-[0.4em]">Casos</a>
        </nav>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowLogin(true)}
            className="font-rajdhani text-[10px] font-black uppercase tracking-[0.3em] text-white bg-white/5 border border-white/10 px-6 py-3 rounded-xl hover:bg-[#00D1FF] hover:text-black transition-all"
          >
            LOGIN ADMIN
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10 px-6 pt-20 pb-32 mx-auto max-w-7xl">
        <div className="relative">
          <div className="max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-3 px-4 py-1.5 mb-10 text-[10px] font-bold uppercase tracking-[0.3em] text-[#00D1FF] border border-[#00D1FF]/20 rounded-full bg-[#00D1FF]/5 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D1FF] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D1FF]"></span>
                </span>
                PROTOCOL RENACE ACTIVE
              </div>
              
              <h1 className="text-7xl md:text-[10rem] font-bebas leading-[0.85] tracking-tight mb-12 select-none">
                <motion.span 
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="block"
                >VENDE</motion.span>
                <motion.span 
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#00D1FF] drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                >
                  MÁS RÁPIDO.
                </motion.span>
              </h1>

              <p className="max-w-xl font-rajdhani text-xl md:text-2xl text-gray-400 mb-16 leading-tight uppercase tracking-wide">
                Reinventando el <span className="text-white font-bold">B2B</span>. 
                Catálogos inmersivos, pedidos en tiempo real y automatización total para mayoristas.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-8">
                <button className="group relative w-full sm:w-auto px-12 py-6 bg-[#00D1FF] text-black rounded-xl font-bebas text-2xl uppercase tracking-wider flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-[0_10px_40px_rgba(0,209,255,0.4)] overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                  Crear Mi Catálogo <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:border-[#00D1FF] transition-colors">
                    <Play className="w-5 h-5 text-white fill-white group-hover:text-[#00D1FF] group-hover:fill-[#00D1FF] transition-all" />
                  </div>
                  <span className="font-rajdhani text-sm font-bold uppercase tracking-[0.3em] text-gray-500 group-hover:text-white transition-colors">
                    Ver Protocolo
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, delay: 0.5 }}
            className="hidden xl:block absolute top-0 right-0 w-[500px] h-[500px]"
          >
            <div className="relative w-full h-full">
              <div className="absolute inset-0 border-[2px] border-[#00D1FF]/20 rounded-full animate-[spin_20s_linear_infinite]" />
              <div className="absolute inset-10 border-[1px] border-[#00D1FF]/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 flex items-center justify-center rotate-45 animate-pulse shadow-[0_0_100px_rgba(0,209,255,0.1)]">
                  <Box className="w-12 h-12 text-[#00D1FF] -rotate-45" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* FEATURES */}
        <div id="features" className="mt-60">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider">
              Arquitectura de <span className="text-[#00D1FF]">Alto Impacto</span>
            </h2>
            <p className="max-w-xs font-rajdhani text-xs font-bold text-gray-500 uppercase tracking-widest leading-loose">
              Cada milisegundo cuenta. Diseñado para cerrar ventas en segundos, no minutos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Smartphone className="w-8 h-8" />}
              title="WhatsApp Native"
              desc="Experiencia de compra fluida sin salir del chat. Cero fricción para el comprador B2B."
              delay={0.1}
            />
            <FeatureCard 
              icon={<BarChart3 className="w-8 h-8" />}
              title="Predictive Analytics"
              desc="Identifica intenciones de compra antes de que ocurran. Inteligencia de datos pura."
              delay={0.2}
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-8 h-8" />}
              title="Enterprise Core"
              desc="Escalabilidad infinita bajo el estándar Renace.tech. Seguridad nivel bancario."
              delay={0.3}
            />
          </div>
        </div>
      </main>

      {/* LOGIN OVERLAY */}
      <AnimatePresence>
        {showLogin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-end p-6"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowLogin(false)} />
            
            <motion.div 
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="relative w-full max-w-lg h-full glass rounded-[40px] p-12 flex flex-col justify-center space-y-12 shadow-[0_0_100px_rgba(0,209,255,0.2)] border-l border-[#00D1FF]/20"
            >
              <button 
                onClick={() => setShowLogin(false)}
                className="absolute top-10 right-10 w-12 h-12 rounded-full glass flex items-center justify-center hover:bg-red-500/20 transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-4">
                <div className="w-16 h-16 bg-[#00D1FF] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(0,209,255,0.4)]">
                  <Lock className="text-black w-8 h-8" />
                </div>
                <h2 className="text-5xl font-bebas tracking-widest uppercase">ADMIN <span className="text-[#00D1FF]">LOGIN</span></h2>
                <p className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">PROTOCOLO DE SEGURIDAD NIVEL 4</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">ID DE ACCESO / EMAIL</label>
                    <div className="relative">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        className="w-full h-16 pl-16 pr-6 bg-white/5 border border-white/10 rounded-2xl font-rajdhani text-sm tracking-widest text-white focus:border-[#00D1FF] outline-none transition-all"
                        placeholder="admin@renace.tech"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">LLAVE DE PROTOCOLO</label>
                    <div className="relative">
                      <Zap className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        type="password"
                        className="w-full h-16 pl-16 pr-6 bg-white/5 border border-white/10 rounded-2xl font-rajdhani text-sm tracking-widest text-white focus:border-[#00D1FF] outline-none transition-all"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {loginError && (
                  <p className="text-red-500 font-rajdhani text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
                    {loginError}
                  </p>
                )}

                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-6 bg-[#00D1FF] text-black rounded-2xl font-bebas text-2xl tracking-widest uppercase flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_50px_rgba(0,209,255,0.3)]"
                >
                  {isLoggingIn ? 'VALIDANDO...' : (
                    <>EJECUTAR ACCESO <LogIn className="w-6 h-6" /></>
                  )}
                </button>
              </form>

              <div className="pt-10 text-center">
                <p className="font-rajdhani text-[8px] text-gray-600 uppercase tracking-[0.4em]">ACCESO RESTRINGIDO A TERMINALES AUTORIZADAS</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="relative z-10 border-t border-white/5 py-32 px-6 bg-[#030303]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <Box className="w-8 h-8 text-[#00D1FF]" />
              <span className="text-3xl font-bebas tracking-widest">CATAGCE</span>
            </div>
            <p className="font-rajdhani text-lg text-gray-500 max-w-sm font-medium uppercase tracking-wider leading-relaxed">
              Liderando la transformación digital de las cadenas de suministro en el Caribe y más allá.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
            <FooterLinkGroup 
              title="Producto" 
              links={['Ecosistema', 'Precios', 'API Docs', 'Status']} 
            />
            <FooterLinkGroup 
              title="Empresa" 
              links={['Misión', 'Protocolo', 'Carreers', 'Contacto']} 
            />
            <FooterLinkGroup 
              title="Legal" 
              links={['Privacidad', 'Seguridad', 'Términos']} 
            />
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-32 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 font-rajdhani text-[10px] font-bold uppercase tracking-[0.4em] text-gray-700">
          <span>© 2026 RENACE TECH INC.</span>
          <div className="flex gap-10">
            <span className="text-gray-500 hover:text-white cursor-pointer transition-colors">Twitter</span>
            <span className="text-gray-500 hover:text-white cursor-pointer transition-colors">LinkedIn</span>
          </div>
          <span>SANTO DOMINGO, DR</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: number }) {
  return (
    <motion.div 
      whileInView={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay }}
      className="group relative p-10 glass glass-hover rounded-[32px] overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
        <ChevronRight className="w-12 h-12 text-[#00D1FF]" />
      </div>
      
      <div className="relative z-10">
        <div className="text-[#00D1FF] mb-10 w-16 h-16 rounded-2xl bg-[#00D1FF]/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#00D1FF] group-hover:text-black transition-all duration-500 shadow-[0_0_20px_rgba(0,209,255,0)] group-hover:shadow-[0_0_30px_rgba(0,209,255,0.4)]">
          {icon}
        </div>
        <h3 className="text-3xl font-bebas tracking-wide mb-4 uppercase">{title}</h3>
        <p className="font-rajdhani text-gray-500 leading-relaxed font-bold text-sm uppercase tracking-widest">
          {desc}
        </p>
      </div>
    </motion.div>
  );
}

function FooterLinkGroup({ title, links }: { title: string, links: string[] }) {
  return (
    <div>
      <h4 className="font-rajdhani text-[11px] font-black uppercase tracking-[0.3em] text-[#00D1FF] mb-8">{title}</h4>
      <ul className="space-y-4">
        {links.map(link => (
          <li key={link} className="font-rajdhani text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-white cursor-pointer transition-colors">
            {link}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LoadingScreen() {
  return (
    <motion.div 
      exit={{ opacity: 0, scale: 1.1 }}
      className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 border-2 border-[#00D1FF]/20 border-t-[#00D1FF] rounded-full animate-spin" />
        <span className="font-rajdhani text-[10px] font-bold uppercase tracking-[0.5em] text-[#00D1FF] animate-pulse">
          Initializing Protocol
        </span>
      </div>
    </motion.div>
  );
}

function Particles({ count }: { count: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: Math.random() * 0.5, 
            x: Math.random() * 100 + "%", 
            y: Math.random() * 100 + "%",
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{ 
            y: [null, "-20px", "20px", null],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{ 
            duration: 5 + Math.random() * 10, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute w-1 h-1 bg-[#00D1FF] rounded-full blur-[1px]"
        />
      ))}
    </div>
  );
}
