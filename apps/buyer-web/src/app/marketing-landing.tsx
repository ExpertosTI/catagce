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
  Store,
  Play
} from 'lucide-react';
import Image from 'next/image';

const getApiBase = () => {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_URL || 'https://api.catagce.renace.tech';
  return 'https://api.catagce.renace.tech';
};

const API_BASE = getApiBase();

export default function MarketingLanding({ host }: { host?: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register state
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSlug, setRegSlug] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState('');

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
      window.location.href = '/dashboard';
    } catch {
      setLoginError('CREDENCIALES INVÁLIDAS. VERIFICA TU ACCESO.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setIsRegistering(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: regName.trim(), 
          email: regEmail.trim().toLowerCase(), 
          password: regPassword,
          slug: regSlug.trim().toLowerCase()
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error en registro');
      }
      const { token } = await res.json();
      localStorage.setItem('catagce_token', token);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setRegError(err.message || 'OCURRIÓ UN ERROR AL CREAR LA CUENTA.');
    } finally {
      setIsRegistering(false);
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
              <button onClick={() => setShowLogin(true)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-black transition-colors">
                Entrar
              </button>
              <button 
                onClick={() => setShowRegister(true)}
                className="px-6 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
              >
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
                <button 
                  onClick={() => setShowRegister(true)}
                  className="w-full sm:w-auto px-10 py-5 bg-[#FACD01] text-black rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-2xl shadow-yellow-200"
                >
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
                    src="/mockup.png" 
                    alt="Catagce SaaS Mockup" 
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

        {/* PRICING SECTION */}
        <section id="pricing" className="py-32 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-xs font-bold text-black bg-[#FACD01]/20 rounded-full border border-[#FACD01]/30">
                PRECIOS SIMPLES
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Elige tu plan</h2>
              <p className="text-gray-500 font-medium max-w-xl mx-auto">
                Empieza gratis. Crece sin sorpresas. Cancela cuando quieras.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <PricingCard
                name="Emprendedor"
                price="Gratis"
                period=""
                desc="Para validar tu catálogo digital."
                features={['1 catálogo', 'Hasta 50 productos', 'Pedidos por WhatsApp', 'Branding básico']}
                cta="Empezar gratis"
              />
              <PricingCard
                name="Mayorista"
                price="$5"
                period="/mes"
                desc="Para negocios que venden a diario."
                features={['Catálogos ilimitados', 'Productos ilimitados', 'Precios B2B', 'Métodos de pago personalizados', 'Reportes y analítica']}
                cta="Empezar Mayorista"
                highlighted
              />
              <PricingCard
                name="Empresa"
                price="$30"
                period="/mes"
                desc="Para equipos y mayoristas."
                features={['Todo de Mayorista', 'Múltiples usuarios', 'Multi-almacén', 'Dominio personalizado', 'Soporte prioritario']}
                cta="Hablar con ventas"
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

      <AnimatePresence>
        {showLogin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <div className="absolute inset-0" onClick={() => setShowLogin(false)} />
            
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

      <AnimatePresence>
        {showRegister && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative"
            >
              <button onClick={() => setShowRegister(false)} className="absolute top-8 right-8 p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-[#FACD01] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-yellow-100">
                  <Zap className="text-black w-8 h-8" />
                </div>
                <h2 className="text-3xl font-black tracking-tight">Crea tu cuenta gratis</h2>
                <p className="text-gray-500 font-medium mt-2">Empieza a vender en minutos con Catagce</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Tu Nombre</label>
                    <input required className="w-full h-14 px-5 bg-gray-50 rounded-xl focus:ring-2 focus:ring-[#FACD01] outline-none font-bold text-sm" placeholder="Juan Pérez" value={regName} onChange={e => setRegName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Slug / Tienda</label>
                    <input required className="w-full h-14 px-5 bg-gray-50 rounded-xl focus:ring-2 focus:ring-[#FACD01] outline-none font-bold text-sm" placeholder="mi-tienda" value={regSlug} onChange={e => setRegSlug(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                  <input required type="email" className="w-full h-14 px-5 bg-gray-50 rounded-xl focus:ring-2 focus:ring-[#FACD01] outline-none font-bold text-sm" placeholder="hola@tienda.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
                  <input required type="password" title="Min 6 caracteres" className="w-full h-14 px-5 bg-gray-50 rounded-xl focus:ring-2 focus:ring-[#FACD01] outline-none font-bold text-sm" placeholder="••••••••" value={regPassword} onChange={e => setRegPassword(e.target.value)} />
                </div>

                {regError && <p className="text-red-500 text-xs font-bold text-center bg-red-50 py-3 rounded-lg border border-red-100">{regError}</p>}

                <button type="submit" disabled={isRegistering} className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-3">
                  {isRegistering ? 'Creando cuenta...' : <>Crear mi cuenta gratis <ArrowRight className="w-5 h-5" /></>}
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

function PricingCard({ name, price, period, desc, features, cta, highlighted = false }: { name: string; price: string; period: string; desc: string; features: string[]; cta: string; highlighted?: boolean }) {
  return (
    <div className={`relative p-10 rounded-[32px] border transition-all ${highlighted ? 'bg-black text-white border-black shadow-2xl scale-[1.03]' : 'bg-gray-50 text-black border-gray-100 hover:shadow-xl'}`}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#FACD01] text-black rounded-full text-xs font-bold">
          MÁS POPULAR
        </div>
      )}
      <h3 className="text-2xl font-bold mb-2">{name}</h3>
      <p className={`text-sm mb-6 font-medium ${highlighted ? 'text-gray-300' : 'text-gray-500'}`}>{desc}</p>
      <div className="mb-8">
        <span className="text-5xl font-extrabold">{price}</span>
        <span className={`text-sm font-medium ${highlighted ? 'text-gray-300' : 'text-gray-500'}`}>{period}</span>
      </div>
      <ul className="space-y-3 mb-10">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm font-medium">
            <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${highlighted ? 'text-[#FACD01]' : 'text-black'}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button className={`w-full py-4 rounded-2xl font-bold text-sm transition-all ${highlighted ? 'bg-[#FACD01] text-black hover:scale-105' : 'bg-black text-white hover:bg-gray-800'}`}>
        {cta}
      </button>
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
