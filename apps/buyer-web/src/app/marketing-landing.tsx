'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Box, 
  ArrowRight, 
  Smartphone, 
  BarChart3, 
  ChevronRight, 
  X, 
  LogIn, 
  Mail, 
  Lock, 
  Zap, 
  CheckCircle2, 
  Users,
  TrendingUp,
  Store
} from 'lucide-react';
import Image from 'next/image';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.catalogo.jhosuacomercial.com';

export default function MarketingLanding({ host }: { host?: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
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
      window.location.reload();
    } catch {
      setLoginError('CREDENCIALES INVÁLIDAS. VERIFICA TU ACCESO.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F9FAFB] text-[#111827] selection:bg-[#FACD01]/30 overflow-x-hidden font-sans">
      <AnimatePresence>
        {!isLoaded && <LoadingScreen />}
      </AnimatePresence>

      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 bg-[#FACD01] rounded-xl flex items-center justify-center shadow-lg shadow-yellow-200/50 transition-transform group-hover:scale-110">
              <Store className="text-black w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">Catagce<span className="text-[#FACD01]">.</span></span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-500">
            <a href="#features" className="hover:text-black transition-colors">Funciones</a>
            <a href="#solutions" className="hover:text-black transition-colors">Soluciones</a>
            <a href="#pricing" className="hover:text-black transition-colors">Precios</a>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowLogin(true)}
              className="text-sm font-bold text-gray-600 hover:text-black transition-colors"
            >
              Iniciar Sesión
            </button>
            <button className="px-6 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-200">
              Crear Cuenta
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="relative pt-20 pb-32 px-6 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-[#FACD01]/10 to-transparent rounded-full blur-3xl -z-10" />
          
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-xs font-bold text-black bg-[#FACD01]/20 rounded-full border border-[#FACD01]/30">
                <Zap className="w-3.5 h-3.5 fill-[#FACD01]" />
                EL ESTÁNDAR PARA MAYORISTAS B2B
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
                Vende más rápido, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-black to-gray-500">gestiona mejor.</span>
              </h1>

              <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-500 mb-12 font-medium leading-relaxed">
                Catálogos digitales inteligentes, pedidos por WhatsApp y gestión de inventario en tiempo real. 
                Todo lo que tu negocio necesita en una sola app.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                <button className="w-full sm:w-auto px-10 py-5 bg-[#FACD01] text-black rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-2xl shadow-yellow-200">
                  Empezar ahora gratis
                </button>
                <button className="w-full sm:w-auto px-10 py-5 bg-white text-black border border-gray-200 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                  <Play className="w-4 h-4 fill-black" /> Ver Demo
                </button>
              </div>

              {/* MOCKUP IMAGE */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="relative max-w-5xl mx-auto"
              >
                <div className="absolute inset-0 bg-[#FACD01]/5 blur-3xl -z-10 rounded-full" />
                <div className="bg-white p-2 rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden">
                  <img 
                    src="/treinta_style_mockup_1778554800766.png" 
                    alt="App Mockup" 
                    className="w-full h-auto rounded-[24px]"
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="py-32 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Diseñado para el crecimiento</h2>
              <p className="text-gray-500 font-medium max-w-xl mx-auto">
                Herramientas poderosas que simplifican el caos de las ventas mayoristas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Smartphone className="w-6 h-6 text-blue-600" />}
                bg="bg-blue-50"
                title="Ventas por WhatsApp"
                desc="Recibe pedidos estructurados directamente en tu chat sin errores manuales."
              />
              <FeatureCard 
                icon={<BarChart3 className="w-6 h-6 text-green-600" />}
                bg="bg-green-50"
                title="Inventario Inteligente"
                desc="Control total de stock con alertas predictivas para que nunca dejes de vender."
              />
              <FeatureCard 
                icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
                bg="bg-purple-50"
                title="Análisis de Negocio"
                desc="Visualiza tus ingresos y productos estrella con reportes automáticos."
              />
            </div>
          </div>
        </section>

        {/* TRUST SECTION */}
        <section className="py-20 bg-gray-50 border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-12 md:gap-24 items-center grayscale opacity-60">
            <div className="flex items-center gap-2 font-bold text-xl"><CheckCircle2 className="w-6 h-6" /> SEGURIDAD B2B</div>
            <div className="flex items-center gap-2 font-bold text-xl"><Users className="w-6 h-6" /> +10k NEGOCIOS</div>
            <div className="flex items-center gap-2 font-bold text-xl"><TrendingUp className="w-6 h-6" /> +50% EFICIENCIA</div>
          </div>
        </section>
      </main>

      {/* LOGIN OVERLAY */}
      <AnimatePresence>
        {showLogin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogin(false)} />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-10 shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setShowLogin(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>

              <div className="mb-10 text-center">
                <div className="w-14 h-14 bg-[#FACD01] rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-200 mx-auto mb-6">
                  <Lock className="text-black w-7 h-7" />
                </div>
                <h2 className="text-3xl font-bold mb-2">Panel Administrativo</h2>
                <p className="text-gray-500 text-sm font-medium">Ingresa tus credenciales autorizadas</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email / Usuario</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:border-[#FACD01] outline-none transition-all"
                        placeholder="admin@catagce.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="password"
                        className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:border-[#FACD01] outline-none transition-all"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {loginError && (
                  <p className="text-red-500 text-xs font-bold text-center bg-red-50 py-3 rounded-lg border border-red-100">
                    {loginError}
                  </p>
                )}

                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
                >
                  {isLoggingIn ? 'Verificando...' : (
                    <>Acceder al Panel <ArrowRight className="w-5 h-5" /></>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-100 py-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FACD01] rounded-lg flex items-center justify-center">
              <Store className="text-black w-5 h-5" />
            </div>
            <span className="font-bold text-lg">Catagce</span>
          </div>
          
          <div className="flex gap-10 text-sm font-semibold text-gray-400">
            <span className="hover:text-black cursor-pointer">Términos</span>
            <span className="hover:text-black cursor-pointer">Privacidad</span>
            <span className="hover:text-black cursor-pointer">Soporte</span>
          </div>

          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">© 2026 RENACE TECH INC.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, bg }: { icon: React.ReactNode, title: string, desc: string, bg: string }) {
  return (
    <div className="p-10 bg-gray-50 rounded-[32px] border border-gray-100 hover:shadow-2xl hover:shadow-gray-200 transition-all group">
      <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="text-gray-500 font-medium leading-relaxed text-sm">
        {desc}
      </p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <motion.div 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-white flex items-center justify-center"
    >
      <div className="w-12 h-12 border-4 border-gray-100 border-t-[#FACD01] rounded-full animate-spin" />
    </motion.div>
  );
}
