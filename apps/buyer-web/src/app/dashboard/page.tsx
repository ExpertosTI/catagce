'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, User, Plus, Package, FileText, LayoutGrid,
  Settings, Home, ShoppingCart, LogIn, Camera, Maximize2,
  ChevronRight, ExternalLink, X, Bell, LogOut, BarChart3,
  Box, ArrowRight, Zap, Globe, ArrowLeft, Lock, Mail, ClipboardCheck, Share2,
  Instagram, MapPin, Phone, MessageSquare, Layout, Palette
} from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop';

type Tab = 'home' | 'products' | 'catalogs' | 'orders' | 'settings';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('catagce_token');
}

async function fetchWithAuth(path: string, options: any = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/* ── UI Components ─────────────────────────────────────────── */

function LogoMark({ color = "#00D1FF" }: { color?: string }) {
  return (
    <div 
      className="relative w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,209,255,0.4)] transition-transform hover:rotate-12"
      style={{ backgroundColor: color }}
    >
      <Box className="text-black w-6 h-6" />
    </div>
  );
}

function NavItem({
  icon, label, active = false, onClick, color = "#00D1FF"
}: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-all relative px-4 py-2 rounded-2xl ${
        active ? '' : 'text-gray-500 hover:text-gray-300'
      }`}
      style={{ color: active ? color : undefined }}
    >
      <div 
        className={`p-2 rounded-xl transition-all ${active ? 'bg-white/10 shadow-[0_0_20px_rgba(0,209,255,0.1)]' : ''}`}
        style={{ color: active ? color : undefined }}
      >
        {icon}
      </div>
      <span className="font-rajdhani text-[9px] font-bold uppercase tracking-[0.2em]">{label}</span>
      {active && (
        <motion.span
          layoutId="nav-indicator"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full shadow-[0_0_10px_#00D1FF]"
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
        />
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedCatalog, setSelectedCatalog] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const prevTabIndex = useRef(0);

  const primaryColor = profile?.branding?.primaryColor || "#00D1FF";

  const TAB_ORDER: Tab[] = ['home', 'products', 'catalogs', 'orders', 'settings'];
  const tabIndex = TAB_ORDER.indexOf(activeTab);
  const direction = tabIndex - prevTabIndex.current;

  const switchTab = (tab: Tab) => {
    prevTabIndex.current = TAB_ORDER.indexOf(activeTab);
    setActiveTab(tab);
  };

  useEffect(() => {
    setToken(getToken());
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchWithAuth('/sellers/profile');
      setProfile(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth('/products');
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCatalogs = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const data = await fetchWithAuth('/catalogs');
      setCatalogs(data);
    } catch {
      setCatalogs([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const data = await fetchWithAuth('/orders');
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadProfile();
      loadProducts();
    } else {
      setLoading(false);
    }
  }, [token, loadProfile, loadProducts]);

  useEffect(() => {
    if (token && activeTab === 'catalogs') loadCatalogs();
    if (token && activeTab === 'orders') loadOrders();
  }, [activeTab, token, loadCatalogs, loadOrders]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (!res.ok) throw new Error('Unauthorized');
      const { token: newToken } = await res.json();
      localStorage.setItem('catagce_token', newToken);
      setToken(newToken);
      showToast('PROTOCOLO DE ACCESO VALIDADO');
    } catch {
      setLoginError('CREDENCIALES INVÁLIDAS. VERIFICA EMAIL Y PASSWORD.');
    }
  };

  const handleCreateCatalog = async (name: string, slug: string) => {
    try {
      await fetchWithAuth('/catalogs', {
        method: 'POST',
        body: JSON.stringify({ name, slug }),
      });
      setIsCreateModalOpen(false);
      loadCatalogs();
      showToast('NUEVO CATÁLOGO GENERADO');
    } catch {
      showToast('ERROR AL GENERAR CATÁLOGO');
    }
  };

  const handleUpdateBranding = async (data: any) => {
    try {
      await fetchWithAuth('/sellers/branding', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      loadProfile();
      showToast('PERFIL ACTUALIZADO CORRECTAMENTE');
    } catch {
      showToast('ERROR AL ACTUALIZAR PERFIL');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('LINK COPIADO AL PORTAPAPELES');
  };

  /* ── Login ───────────────────────────────────────────────── */
  if (!token) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6 font-sans overflow-hidden">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div 
            className="absolute inset-0 opacity-20 transition-opacity duration-1000"
            style={{
              background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 209, 255, 0.15), transparent 80%)`
            }}
          />
          <div className="absolute inset-0 grid-pattern opacity-10" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-sm glass rounded-[40px] p-10 space-y-8 shadow-2xl"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <LogoMark />
            <h1 className="text-4xl font-bebas tracking-widest text-white mt-2 uppercase">
              ADMIN <span className="text-[#00D1FF]">CATAGCE</span>
            </h1>
            <p className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">
              SISTEMA DE GESTIÓN OPERATIVA
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <label className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-2 mb-1 block">USUARIO / EMAIL</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    className="w-full h-14 pl-14 pr-6 bg-white/5 border border-white/10 rounded-2xl focus:border-[#00D1FF] focus:outline-none text-white font-rajdhani text-sm tracking-widest placeholder:text-white/10 transition-all"
                    placeholder="admin@renace.tech"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="relative">
                <label className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-2 mb-1 block">PASSWORD DE PROTOCOLO</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    className="w-full h-14 pl-14 pr-6 bg-white/5 border border-white/10 rounded-2xl focus:border-[#00D1FF] focus:outline-none text-white font-rajdhani text-sm tracking-widest placeholder:text-white/10 transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            
            <AnimatePresence>
              {loginError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-red-500 font-rajdhani text-[10px] font-bold uppercase tracking-widest text-center"
                >
                  {loginError}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="w-full py-5 bg-[#00D1FF] text-black rounded-2xl font-bebas text-xl tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(0,209,255,0.3)]"
            >
              <LogIn className="w-6 h-6" /> INICIAR SESIÓN
            </button>
          </form>

          <p className="text-center font-rajdhani text-[8px] text-gray-600 uppercase tracking-widest">
            ACCESO RESTRINGIDO A PERSONAL AUTORIZADO
          </p>
        </motion.div>
      </div>
    );
  }

  /* ── Dashboard shell ─────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#050505] text-white pb-32 overflow-x-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div 
          className="absolute inset-0 opacity-10 transition-opacity duration-1000"
          style={{
            background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, ${primaryColor}22, transparent 80%)`
          }}
        />
        <div className="absolute inset-0 grid-pattern opacity-5" />
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] glass px-8 py-4 rounded-2xl font-rajdhani text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl border-white/10"
            style={{ borderLeft: `2px solid ${primaryColor}` }}
          >
            ✦ {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="relative z-50 flex items-center justify-between px-6 pt-8 pb-6 mx-auto max-w-7xl">
        <div className="flex items-center gap-4">
          {profile?.branding?.logoUrl ? (
            <img src={profile.branding.logoUrl} className="w-10 h-10 rounded-xl object-contain bg-white/5" />
          ) : (
            <LogoMark color={primaryColor} />
          )}
          <div className="hidden sm:block">
            <h1 className="text-2xl font-bebas tracking-widest uppercase">
              {profile?.name || 'CATAGCE'}<span style={{ color: primaryColor }}>.</span>OPERATIONS
            </h1>
            <p className="font-rajdhani text-[8px] font-black text-gray-600 uppercase tracking-[0.4em]">ADMINISTRATION CORE v2.2</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button
            onClick={() => { localStorage.removeItem('catagce_token'); setToken(null); showToast('SESIÓN CERRADA'); }}
            className="relative w-12 h-12 rounded-xl glass flex items-center justify-center border-white/10 hover:border-white/20 transition-all hover:scale-105 active:scale-95"
          >
            <User className="w-5 h-5" style={{ color: primaryColor }} />
            <span 
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#050505]"
              style={{ backgroundColor: primaryColor, boxShadow: `0 0 10px ${primaryColor}` }}
            />
          </button>
        </div>
      </header>

      <main className="relative z-10 px-6 mx-auto max-w-7xl pt-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            variants={{
              enter: (dir: number) => ({ x: dir > 0 ? 20 : -20, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (dir: number) => ({ x: dir > 0 ? -20 : 20, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {activeTab === 'home' && <HomeView products={products} loading={loading} color={primaryColor} onExportPdf={() => showToast('GENERANDO PDF...')} />}
            {activeTab === 'products' && <ProductsView products={products} loading={loading} color={primaryColor} />}
            {activeTab === 'catalogs' && (
              <CatalogsView
                catalogs={catalogs}
                loading={catalogLoading}
                selected={selectedCatalog}
                color={primaryColor}
                onSelect={setSelectedCatalog}
                onClose={() => setSelectedCatalog(null)}
                onOrder={(slug: string) => window.open(`/order/${slug}`, '_blank')}
                onShare={(slug: string) => copyToClipboard(`${window.location.origin}/order/${slug}`)}
                onCreate={() => setIsCreateModalOpen(true)}
              />
            )}
            {activeTab === 'orders' && <OrdersView orders={orders} loading={ordersLoading} color={primaryColor} />}
            {activeTab === 'settings' && (
              <SettingsView 
                profile={profile} 
                onUpdate={handleUpdateBranding} 
                onLogout={() => { localStorage.removeItem('catagce_token'); setToken(null); }} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isCreateModalOpen && (
          <CreateCatalogModal 
            onClose={() => setIsCreateModalOpen(false)} 
            onSubmit={handleCreateCatalog}
            color={primaryColor}
          />
        )}
      </AnimatePresence>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-50">
        <div className="glass backdrop-blur-2xl border-white/5 rounded-[32px] px-6 py-4 flex justify-around items-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <NavItem icon={<Home className="w-5 h-5" />} label="Home" active={activeTab === 'home'} onClick={() => switchTab('home')} color={primaryColor} />
          <NavItem icon={<LayoutGrid className="w-5 h-5" />} label="Stock" active={activeTab === 'products'} onClick={() => switchTab('products')} color={primaryColor} />
          <NavItem icon={<Package className="w-5 h-5" />} label="CTGO" active={activeTab === 'catalogs'} onClick={() => switchTab('catalogs')} color={primaryColor} />
          <NavItem icon={<ShoppingCart className="w-5 h-5" />} label="Pedidos" active={activeTab === 'orders'} onClick={() => switchTab('orders')} color={primaryColor} />
          <NavItem icon={<Settings className="w-5 h-5" />} label="Config" active={activeTab === 'settings'} onClick={() => switchTab('settings')} color={primaryColor} />
        </div>
      </nav>
    </div>
  );
}

/* ── View Components ────────────────────────────────────────── */

function HomeView({ products, loading, color, onExportPdf }: any) {
  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h2 className="text-6xl font-bebas tracking-wide mb-2 uppercase">INVENTARIO <span style={{ color }}>GLOBAL</span></h2>
          <p className="font-rajdhani text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">MONITOREO DE ACTIVOS EN TIEMPO REAL</p>
        </div>
        <button
          onClick={onExportPdf}
          className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bebas text-lg tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-3"
        >
          <FileText className="w-5 h-5" /> EXPORTAR PDF
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : products.map((p: any) => <ProductCard key={p.id} product={p} color={color} />)
        }
      </div>
    </div>
  );
}

function ProductsView({ products, loading, color }: any) {
  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <h2 className="text-6xl font-bebas tracking-wide uppercase">GESTIÓN DE <span style={{ color }}>SKU</span></h2>
        <span className="font-bebas text-2xl text-gray-700">{products.length} ITEMS</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : products.map((p: any) => <ProductCard key={p.id} product={p} color={color} />)
        }
      </div>
    </div>
  );
}

function CatalogsView({ catalogs, loading, selected, onSelect, onClose, onOrder, onShare, onCreate, color }: any) {
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

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {(selected.catalogProducts ?? []).map((cp: any) => (
                  <div key={cp.id} className="glass rounded-[24px] overflow-hidden group">
                    <div className="aspect-square relative">
                      <img src={cp.product?.imageUrl ?? FALLBACK_IMG} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="p-4">
                      <p className="font-bebas text-lg tracking-wide uppercase truncate">{cp.product?.name}</p>
                      <p className="font-rajdhani text-[10px] font-black mt-1" style={{ color }}>${cp.product?.basePrice}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-20 flex flex-col md:flex-row gap-6">
                <button
                  onClick={() => onOrder(selected.slug)}
                  className="flex-1 py-8 text-black rounded-[32px] font-bebas text-3xl tracking-widest uppercase hover:scale-[1.02] transition-all shadow-[0_20px_50px_rgba(0,209,255,0.3)]"
                  style={{ backgroundColor: color }}
                >
                  ABRIR VISTA PÚBLICA <ArrowRight className="inline ml-4" />
                </button>
                <button 
                  onClick={() => onShare(selected.slug)}
                  className="px-12 py-8 glass border-white/10 rounded-[32px] font-bebas text-3xl tracking-widest uppercase hover:bg-white/10 transition-all flex items-center gap-4"
                >
                  <Share2 className="w-8 h-8" /> COMPARTIR LINK
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OrdersView({ orders, loading, color }: any) {
  return (
    <div className="space-y-12">
      <h2 className="text-6xl font-bebas tracking-wide uppercase">COLA DE <span style={{ color }}>PEDIDOS</span></h2>
      
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 glass rounded-3xl animate-pulse" />
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
            <div key={order.id} className="glass p-8 rounded-[32px] flex flex-col md:flex-row justify-between items-center gap-6 border-white/5 hover:border-white/20 transition-all">
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

              <button className="px-8 py-3 glass border-white/10 rounded-xl font-bebas text-sm tracking-widest uppercase hover:bg-white hover:text-black transition-all">
                DETALLES
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsView({ profile, onUpdate, onLogout }: any) {
  const [formData, setFormData] = useState<any>({
    name: '',
    logoUrl: '',
    bannerUrl: '',
    primaryColor: '#00D1FF',
    phone: '',
    whatsapp: '',
    address: '',
    instagram: '',
    website: '',
    description: '',
  });

  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'branding' | 'security'>('profile');

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        logoUrl: profile.branding?.logoUrl || '',
        bannerUrl: profile.branding?.bannerUrl || '',
        primaryColor: profile.branding?.primaryColor || '#00D1FF',
        phone: profile.branding?.phone || '',
        whatsapp: profile.branding?.whatsapp || '',
        address: profile.branding?.address || '',
        instagram: profile.branding?.instagram || '',
        website: profile.branding?.website || '',
        description: profile.branding?.description || '',
      });
    }
  }, [profile]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    onUpdate(formData);
  };

  const primaryColor = profile?.branding?.primaryColor || "#00D1FF";

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <h2 className="text-6xl font-bebas tracking-wide uppercase">CONFIG <span style={{ color: primaryColor }}>CORE</span></h2>
        <div className="flex gap-4 glass p-2 rounded-2xl">
          {(['profile', 'branding', 'security'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveSubTab(t)}
              className={`px-6 py-2 rounded-xl font-rajdhani text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSubTab === t ? 'bg-white text-black shadow-xl' : 'text-gray-500 hover:text-white'
              }`}
            >
              {t === 'profile' ? 'PERFIL' : t === 'branding' ? 'DISEÑO' : 'SEGURIDAD'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left column: Preview */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass rounded-[40px] overflow-hidden group">
            <div className="h-32 relative bg-gradient-to-r from-gray-900 to-black">
              {formData.bannerUrl && <img src={formData.bannerUrl} className="w-full h-full object-cover" />}
              <div className="absolute -bottom-10 left-8">
                <div className="w-20 h-20 rounded-2xl glass p-2">
                  <img src={formData.logoUrl || FALLBACK_IMG} className="w-full h-full object-contain rounded-xl" />
                </div>
              </div>
            </div>
            <div className="p-8 pt-14 space-y-4">
              <h3 className="text-3xl font-bebas tracking-wide">{formData.name || 'MI EMPRESA'}</h3>
              <p className="font-rajdhani text-[10px] text-gray-500 uppercase tracking-widest line-clamp-2">{formData.description || 'SIN DESCRIPCIÓN'}</p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-3 font-rajdhani text-[10px] text-gray-400">
                  <Phone className="w-3 h-3" style={{ color: primaryColor }} /> {formData.phone || 'NO CONFIG'}
                </div>
                <div className="flex items-center gap-3 font-rajdhani text-[10px] text-gray-400">
                  <MapPin className="w-3 h-3" style={{ color: primaryColor }} /> {formData.address || 'NO CONFIG'}
                </div>
              </div>
            </div>
          </div>
          
          <button onClick={onLogout} className="w-full py-6 bg-red-500/5 border border-red-500/20 text-red-500 font-bebas text-xl tracking-widest uppercase rounded-[32px] hover:bg-red-500 hover:text-white transition-all">
            DETENER SESIÓN ACTUAL <LogOut className="inline ml-3 w-5 h-5" />
          </button>
        </div>

        {/* Right column: Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="glass p-10 rounded-[40px] space-y-8">
            {activeSubTab === 'profile' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">NOMBRE COMERCIAL</label>
                  <input name="name" value={formData.name} onChange={handleChange} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 font-rajdhani text-sm tracking-widest text-white focus:border-[#00D1FF] outline-none" placeholder="EJ: JHOSUA COMERCIAL" />
                </div>
                <div className="space-y-2">
                  <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">WHATSAPP / TELÉFONO</label>
                  <input name="phone" value={formData.phone} onChange={handleChange} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 font-rajdhani text-sm tracking-widest text-white focus:border-[#00D1FF] outline-none" placeholder="+1 809 ..." />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">DIRECCIÓN FÍSICA</label>
                  <input name="address" value={formData.address} onChange={handleChange} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 font-rajdhani text-sm tracking-widest text-white focus:border-[#00D1FF] outline-none" placeholder="CALLE, CIUDAD, PAÍS" />
                </div>
                <div className="space-y-2">
                  <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">INSTAGRAM</label>
                  <input name="instagram" value={formData.instagram} onChange={handleChange} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 font-rajdhani text-sm tracking-widest text-white focus:border-[#00D1FF] outline-none" placeholder="@usuario" />
                </div>
                <div className="space-y-2">
                  <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">SITIO WEB</label>
                  <input name="website" value={formData.website} onChange={handleChange} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 font-rajdhani text-sm tracking-widest text-white focus:border-[#00D1FF] outline-none" placeholder="https://..." />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">DESCRIPCIÓN DE MARCA</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 font-rajdhani text-sm tracking-widest text-white focus:border-[#00D1FF] outline-none resize-none" placeholder="Cuentale a tus clientes sobre tu negocio..." />
                </div>
              </div>
            )}

            {activeSubTab === 'branding' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">COLOR DE MARCA (PRIMARY)</label>
                  <div className="flex gap-4">
                    <input type="color" name="primaryColor" value={formData.primaryColor} onChange={handleChange} className="w-14 h-14 bg-transparent border-none outline-none cursor-pointer" />
                    <input name="primaryColor" value={formData.primaryColor} onChange={handleChange} className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl px-6 font-rajdhani text-sm tracking-widest text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">URL LOGOTIPO</label>
                  <input name="logoUrl" value={formData.logoUrl} onChange={handleChange} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 font-rajdhani text-sm tracking-widest text-white focus:border-[#00D1FF] outline-none" placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">URL BANNER / PORTADA</label>
                  <input name="bannerUrl" value={formData.bannerUrl} onChange={handleChange} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 font-rajdhani text-sm tracking-widest text-white focus:border-[#00D1FF] outline-none" placeholder="https://..." />
                </div>
              </div>
            )}

            {activeSubTab === 'security' && (
              <div className="space-y-6">
                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl">
                  <p className="font-rajdhani text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <Zap className="w-3 h-3" /> ZONA CRÍTICA
                  </p>
                  <p className="font-rajdhani text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed">
                    LOS CAMBIOS EN ESTA SECCIÓN PUEDEN REQUERIR REINICIAR SESIÓN O PUEDEN EXPONER LLAVES DE PROTOCOLO.
                  </p>
                </div>
                <button type="button" className="w-full py-5 glass border-white/10 rounded-2xl font-bebas text-xl tracking-widest uppercase hover:bg-white/10 transition-all">
                  REGENERAR JWT SECRET
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-6 text-black rounded-[28px] font-bebas text-3xl tracking-widest uppercase hover:scale-[1.02] transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
              style={{ backgroundColor: primaryColor }}
            >
              GUARDAR CAMBIOS <ArrowRight className="inline ml-3" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, color }: { product: any; color: string }) {
  const stock = product.stockLevels?.[0]?.onHandBase ?? 0;
  return (
    <motion.div whileHover={{ y: -8 }} className="group relative glass glass-hover rounded-[32px] overflow-hidden">
      <div className="aspect-square relative overflow-hidden">
        <img src={product.imageUrl || FALLBACK_IMG} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-60" />
      </div>
      <div className="p-6 space-y-4">
        <div>
          <h3 className="font-bebas text-2xl tracking-wide uppercase truncate group-hover:text-white transition-colors" style={{ color: `${color}cc` }}>{product.name}</h3>
          <p className="font-rajdhani text-sm font-bold" style={{ color }}>${product.basePrice} USD</p>
        </div>
        <div className="flex items-center justify-between font-rajdhani text-[10px] font-bold text-gray-600 uppercase tracking-widest border-t border-white/5 pt-4">
          <span>STOCK: {stock} {product.baseUom?.symbol || 'un'}</span>
          <div 
            className={`w-2 h-2 rounded-full animate-pulse`} 
            style={{ backgroundColor: stock > 0 ? '#22c55e' : '#ef4444' }}
          />
        </div>
        <button 
          className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-bebas text-sm tracking-widest uppercase hover:text-black transition-all"
          style={{ '--hover-bg': color } as any}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = color)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
        >
          VER DETALLES
        </button>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return <div className="aspect-[3/4] glass rounded-[32px] animate-pulse" />;
}

function CreateCatalogModal({ onClose, onSubmit, color }: any) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative glass p-10 rounded-[40px] w-full max-w-lg space-y-8">
        <h3 className="text-4xl font-bebas tracking-widest uppercase">GENERAR <span style={{ color }}>CATÁLOGO</span></h3>
        <div className="space-y-4">
          <div>
            <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">NOMBRE DEL CATÁLOGO</label>
            <input className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 font-rajdhani text-sm tracking-widest text-white focus:border-[#00D1FF] outline-none transition-all" value={name} onChange={(e) => setName(e.target.value)} placeholder="EJ: TEMPORADA 2026" />
          </div>
          <div>
            <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">SLUG DE ACCESO (URL)</label>
            <input className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 font-rajdhani text-sm tracking-widest text-white focus:border-[#00D1FF] outline-none transition-all" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/ /g, '-'))} placeholder="ej: temporada-2026" />
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 py-5 glass border-white/10 rounded-2xl font-bebas text-xl tracking-widest uppercase">CANCELAR</button>
          <button 
            onClick={() => onSubmit(name, slug)} 
            className="flex-1 py-5 text-black rounded-2xl font-bebas text-xl tracking-widest uppercase shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
            style={{ backgroundColor: color }}
          >
            CREAR
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
