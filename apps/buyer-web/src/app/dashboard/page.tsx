'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, User, Plus, Package, FileText, LayoutGrid,
  Settings, Home, ShoppingCart, LogIn, Camera, Maximize2,
  ChevronRight, ExternalLink, X, Bell, LogOut, BarChart3,
  Box, ArrowRight, Zap, Globe, ArrowLeft, Lock, Mail, ClipboardCheck, Share2,
  Instagram, MapPin, Phone, MessageSquare, Layout, Palette,
  TrendingUp, Users, DollarSign, Filter, Edit2
} from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';

const getApiBase = () => {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_URL || 'https://api.catagce.renace.tech';
  return 'https://api.catagce.renace.tech';
};

const API_BASE = getApiBase();
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&auto=format&fit=crop';

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

function LogoMark({ color = "#FACD01" }: { color?: string }) {
  return (
    <div 
      className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-100 transition-transform hover:rotate-12"
      style={{ backgroundColor: color }}
    >
      <Box className="text-black w-7 h-7" />
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
        active ? 'bg-[#FACD01] text-black shadow-lg shadow-yellow-200/50' : 'text-gray-500 hover:bg-gray-50 hover:text-black'
      }`}
    >
      {icon}
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </button>
  );
}

function StatCard({ title, value, change, icon, trend }: any) {
  return (
    <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm font-bold text-gray-500">{title}</p>
        <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-2xl font-black tracking-tight">{value}</h3>
          {change && (
            <p className={`text-xs font-bold mt-1 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
              {trend === 'up' ? '+' : '-'}{change}
            </p>
          )}
        </div>
        {trend && (
           <TrendingUp className={`w-5 h-5 ${trend === 'up' ? 'text-green-500' : 'text-red-400'}`} />
        )}
      </div>
    </div>
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
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
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

  const handleCreateProduct = async (data: any) => {
    try {
      await fetchWithAuth('/products', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setIsCreateProductOpen(false);
      loadProducts();
      showToast('PRODUCTO CREADO');
    } catch {
      showToast('ERROR AL CREAR PRODUCTO');
    }
  };

  const handleAddProductToCatalog = async (catalogId: string, productId: string) => {
    try {
      await fetchWithAuth(`/catalogs/${catalogId}/products`, {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
      const data = await fetchWithAuth('/catalogs');
      setCatalogs(data);
      const refreshed = data.find((c: any) => c.id === catalogId);
      if (refreshed) setSelectedCatalog(refreshed);
      showToast('PRODUCTO AÑADIDO');
    } catch {
      showToast('ERROR AL AÑADIR PRODUCTO');
    }
  };

  const handleRemoveProductFromCatalog = async (catalogId: string, productId: string) => {
    try {
      await fetchWithAuth(`/catalogs/${catalogId}/products/${productId}`, { method: 'DELETE' });
      const data = await fetchWithAuth('/catalogs');
      setCatalogs(data);
      const refreshed = data.find((c: any) => c.id === catalogId);
      if (refreshed) setSelectedCatalog(refreshed);
      showToast('PRODUCTO ELIMINADO');
    } catch {
      showToast('ERROR AL ELIMINAR');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await fetchWithAuth(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadOrders();
      showToast(`PEDIDO ${status.toUpperCase()}`);
    } catch {
      showToast('ERROR AL ACTUALIZAR PEDIDO');
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
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-6 font-sans overflow-hidden">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 grid-pattern opacity-5" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md bg-white rounded-[48px] p-12 space-y-10 shadow-2xl shadow-gray-200/50 border border-gray-100"
        >
          <div className="flex flex-col items-center text-center space-y-6">
            <LogoMark />
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[#0F172A]">
                Catagce<span className="text-[#FACD01]">.</span>Admin
              </h1>
              <p className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-widest">
                Gestión de Catálogos e Inventario
              </p>
            </div>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Usuario / Email</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    className="w-full h-14 pl-14 pr-6 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FACD01]/50 outline-none text-sm font-bold placeholder:text-gray-300 transition-all"
                    placeholder="admin@renace.tech"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    className="w-full h-14 pl-14 pr-6 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FACD01]/50 outline-none text-sm font-bold placeholder:text-gray-300 transition-all"
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
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-[#FACD01] rounded-xl flex items-center justify-center shadow-lg shadow-yellow-100">
              <Plus className="text-black w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">Catagce<span className="text-[#FACD01]">.</span></span>
          </div>

          <nav className="space-y-2">
            <SidebarItem icon={<Home className="w-5 h-5" />} label="Dashboard" active={activeTab === 'home'} onClick={() => switchTab('home')} />
            <SidebarItem icon={<LayoutGrid className="w-5 h-5" />} label="Catálogo" active={activeTab === 'products'} onClick={() => switchTab('products')} />
            <SidebarItem icon={<ShoppingCart className="w-5 h-5" />} label="Ventas" active={activeTab === 'orders'} onClick={() => switchTab('orders')} />
            {profile?.role === 'admin' && (
              <SidebarItem icon={<Users className="w-5 h-5" />} label="Clientes" active={activeTab === 'tenants'} onClick={() => switchTab('tenants')} />
            )}
            <SidebarItem icon={<Package className="w-5 h-5" />} label="Pedidos" active={activeTab === 'orders'} onClick={() => switchTab('orders')} />
            <SidebarItem icon={<BarChart3 className="w-5 h-5" />} label="Reportes" active={activeTab === 'home'} onClick={() => switchTab('home')} />
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-gray-50">
          <SidebarItem icon={<Settings className="w-5 h-5" />} label="Config" active={activeTab === 'settings'} onClick={() => switchTab('settings')} />
          <button 
            onClick={() => { localStorage.removeItem('catagce_token'); setToken(null); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 mt-2 text-red-400 hover:bg-red-50 rounded-xl transition-all font-bold text-sm"
          >
            <LogOut className="w-5 h-5" /> Salir
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 min-w-0">
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-10 sticky top-0 z-40">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                placeholder="Busca productos, clientes..." 
                className="w-full h-11 pl-11 pr-4 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#FACD01]/50 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900 leading-none">{profile?.name || 'Usuario'}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-wider">Admin</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                 {profile?.branding?.logoUrl ? (
                   <img src={profile.branding.logoUrl} className="w-full h-full object-cover" />
                 ) : (
                   <User className="text-gray-400 w-5 h-5" />
                 )}
              </div>
            </div>
            <button className="w-40 h-11 bg-[#FACD01] text-black rounded-xl font-bold text-sm shadow-lg shadow-yellow-100 flex items-center justify-center gap-2 hover:scale-105 transition-all">
              <Plus className="w-4 h-4" /> Nuevo Pedido
            </button>
          </div>
        </header>

        <main className="p-10 max-w-[1600px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'home' && <HomeView products={products} orders={orders} loading={loading} color={primaryColor} onExportPdf={() => showToast('GENERANDO PDF...')} />}
              {activeTab === 'products' && <ProductsView products={products} loading={loading} color={primaryColor} onCreate={() => setIsCreateProductOpen(true)} />}
              {activeTab === 'catalogs' && (
                <CatalogsView
                  catalogs={catalogs}
                  products={products}
                  loading={catalogLoading}
                  selected={selectedCatalog}
                  color={primaryColor}
                  onSelect={setSelectedCatalog}
                  onClose={() => setSelectedCatalog(null)}
                  onOrder={(slug: string) => window.open(`/order/${slug}`, '_blank')}
                  onShare={(slug: string) => copyToClipboard(`${window.location.origin}/order/${slug}`)}
                  onCreate={() => setIsCreateModalOpen(true)}
                  onAddProduct={handleAddProductToCatalog}
                  onRemoveProduct={handleRemoveProductFromCatalog}
                />
              )}
              {activeTab === 'orders' && <OrdersView orders={orders} loading={ordersLoading} color={primaryColor} onUpdateStatus={handleUpdateOrderStatus} />}
              {activeTab === 'settings' && (
                <SettingsView 
                  profile={profile} 
                  onUpdate={handleUpdateBranding} 
                  onLogout={() => { localStorage.removeItem('catagce_token'); setToken(null); }} 
                />
              )}
              {activeTab === 'tenants' && <TenantsView color={primaryColor} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function TenantsView({ color }: any) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth('/sellers')
      .then(setTenants)
      .catch(() => setTenants([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Administración de Tenants</h2>
          <p className="text-sm font-medium text-gray-400">Gestiona las cuentas de los vendedores</p>
        </div>
        <button className="px-6 py-3 bg-[#FACD01] text-black rounded-xl font-bold text-sm shadow-lg shadow-yellow-100 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Seller
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <th className="px-8 py-6">Vendedor</th>
              <th className="px-8 py-6">Estado</th>
              <th className="px-8 py-6">Plan</th>
              <th className="px-8 py-6">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={4} className="px-8 py-6 h-20 bg-gray-50/50" />
                </tr>
              ))
            ) : tenants.map((t: any) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-400">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{t.name}</p>
                      <p className="text-xs text-gray-400 font-medium">{t.email || t.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    t.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {t.status || 'active'}
                  </span>
                </td>
                <td className="px-8 py-6 font-bold text-sm">
                  {t.role === 'admin' ? 'SuperAdmin' : 'Pro Plan'}
                </td>
                <td className="px-8 py-6">
                  <button className="text-xs font-bold text-gray-400 hover:text-black transition-colors">Configurar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── View Components ────────────────────────────────────────── */

function HomeView({ products, orders, loading, color }: any) {
  const totalSales = orders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);
  const pendingOrders = orders.filter((o: any) => o.status === 'submitted').length;
  const totalStock = products.reduce((sum: number, p: any) => sum + (p.stockLevels?.[0]?.onHandBase || 0), 0);

  return (
    <div className="space-y-10">
      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Ventas Mensuales" value={`$${totalSales.toLocaleString()}`} change="12.5%" trend="up" icon={<DollarSign className="w-5 h-5" />} />
        <StatCard title="Pedidos Hoy" value={orders.length} change={`Pendientes: ${pendingOrders}`} trend="up" icon={<ShoppingCart className="w-5 h-5" />} />
        <StatCard title="Stock Disponible" value={`${totalStock} items`} change="critical: 12" trend="down" icon={<Box className="w-5 h-5" />} />
        <StatCard title="Ingresos" value={`$${(totalSales * 0.65).toLocaleString()}`} icon={<ArrowRight className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Catálogo de Productos</h2>
              <p className="text-sm font-medium text-gray-400">{products.length} Productos</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold shadow-sm">
                <Filter className="w-3.5 h-3.5" /> Filtros
              </button>
              <button className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold shadow-sm">
                Crear Producto
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : products.map((p: any) => <ProductCard key={p.id} product={p} color={color} />)
            }
          </div>
        </div>

        <div>
           <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold tracking-tight">Estado de Pedidos WhatsApp</h2>
              <button className="text-xs font-bold text-gray-400 hover:text-black transition-colors">Ver Todos</button>
           </div>
           
           <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-gray-50 flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
               <span>Cliente</span>
               <span>Estado</span>
             </div>
             <div className="divide-y divide-gray-50">
               {orders.slice(0, 5).map((order: any) => (
                 <div key={order.id} className="p-6 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-500">
                        {order.buyerName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{order.buyerName}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">#{order.id.slice(0, 4)}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-bold text-green-500 flex items-center gap-1 justify-end">
                        <MessageSquare className="w-3 h-3" /> {order.status}
                      </p>
                      <button className="mt-2 text-[10px] font-bold bg-gray-50 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all">
                        Confirmar
                      </button>
                   </div>
                 </div>
               ))}
               {orders.length === 0 && (
                 <div className="p-10 text-center text-gray-300 font-bold text-xs">SIN PEDIDOS RECIENTES</div>
               )}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function ProductsView({ products, loading, color, onCreate }: any) {
  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <h2 className="text-6xl font-bebas tracking-wide uppercase">GESTIÓN DE <span style={{ color }}>SKU</span></h2>
        <div className="flex items-center gap-6">
          <span className="font-bebas text-2xl text-gray-700">{products.length} ITEMS</span>
          <button
            onClick={onCreate}
            className="w-14 h-14 rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-[0_0_20px_rgba(0,209,255,0.4)]"
            style={{ backgroundColor: color }}
          >
            <Plus className="w-8 h-8 text-black" />
          </button>
        </div>
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

function CatalogsView({ catalogs, products, loading, selected, onSelect, onClose, onOrder, onShare, onCreate, onAddProduct, onRemoveProduct, color }: any) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const inCatalogIds = new Set((selected?.catalogProducts ?? []).map((cp: any) => cp.product?.id));
  const available = (products ?? []).filter((p: any) => !inCatalogIds.has(p.id));
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
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {(selected.catalogProducts ?? []).map((cp: any) => (
                  <div key={cp.id} className="glass rounded-[24px] overflow-hidden group relative">
                    <div className="aspect-square relative">
                      <img src={cp.product?.imageUrl ?? FALLBACK_IMG} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <button
                        onClick={() => onRemoveProduct(selected.id, cp.product.id)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Quitar del catálogo"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    <div className="p-4">
                      <p className="font-bebas text-lg tracking-wide uppercase truncate">{cp.product?.name}</p>
                      <p className="font-rajdhani text-[10px] font-black mt-1" style={{ color }}>${cp.product?.basePrice}</p>
                    </div>
                  </div>
                ))}
              </div>

              <AnimatePresence>
                {pickerOpen && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setPickerOpen(false)} />
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative glass p-8 rounded-[32px] w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-3xl font-bebas tracking-widest uppercase">AÑADIR <span style={{ color }}>PRODUCTOS</span></h3>
                        <button onClick={() => setPickerOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"><X className="w-5 h-5" /></button>
                      </div>
                      {available.length === 0 ? (
                        <p className="text-center font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-widest py-12">SIN PRODUCTOS DISPONIBLES PARA AÑADIR</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {available.map((p: any) => (
                            <button key={p.id} onClick={() => onAddProduct(selected.id, p.id)} className="glass p-4 rounded-2xl text-left hover:bg-white/10 transition-all">
                              <div className="aspect-square mb-3 rounded-xl overflow-hidden bg-white/5">
                                <img src={p.imageUrl || FALLBACK_IMG} className="w-full h-full object-cover" />
                              </div>
                              <p className="font-bebas text-sm tracking-wide uppercase truncate">{p.name}</p>
                              <p className="font-rajdhani text-[10px] font-bold mt-1" style={{ color }}>${p.basePrice}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

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

function OrdersView({ orders, loading, color, onUpdateStatus }: any) {
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

              <div className="flex gap-2">
                {order.status === 'submitted' && (
                  <>
                    <button onClick={() => onUpdateStatus(order.id, 'confirmed')} className="px-5 py-3 rounded-xl font-bebas text-sm tracking-widest uppercase bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500 hover:text-black transition-all">
                      CONFIRMAR
                    </button>
                    <button onClick={() => onUpdateStatus(order.id, 'rejected')} className="px-5 py-3 rounded-xl font-bebas text-sm tracking-widest uppercase bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all">
                      RECHAZAR
                    </button>
                  </>
                )}
                {order.status === 'confirmed' && (
                  <button onClick={() => onUpdateStatus(order.id, 'shipped')} className="px-5 py-3 rounded-xl font-bebas text-sm tracking-widest uppercase bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white transition-all">
                    MARCAR ENVIADO
                  </button>
                )}
                {order.status === 'shipped' && (
                  <button onClick={() => onUpdateStatus(order.id, 'delivered')} className="px-5 py-3 rounded-xl font-bebas text-sm tracking-widest uppercase bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all">
                    ENTREGADO
                  </button>
                )}
              </div>
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
    paymentMethods: '',
  });

  const [paymentList, setPaymentList] = useState<Array<{ type: string; label: string; details: string }>>([]);
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'branding' | 'payments' | 'security'>('profile');

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
        paymentMethods: profile.branding?.paymentMethods || '',
      });
      try {
        const parsed = profile.branding?.paymentMethods ? JSON.parse(profile.branding.paymentMethods) : [];
        setPaymentList(Array.isArray(parsed) ? parsed : []);
      } catch {
        setPaymentList([]);
      }
    }
  }, [profile]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    onUpdate({ ...formData, paymentMethods: JSON.stringify(paymentList) });
  };

  const addPayment = () => setPaymentList((p) => [...p, { type: 'bank', label: '', details: '' }]);
  const updatePayment = (i: number, key: string, val: string) => setPaymentList((p) => p.map((it, idx) => idx === i ? { ...it, [key]: val } : it));
  const removePayment = (i: number) => setPaymentList((p) => p.filter((_, idx) => idx !== i));

  const primaryColor = profile?.branding?.primaryColor || "#00D1FF";

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <h2 className="text-6xl font-bebas tracking-wide uppercase">CONFIG <span style={{ color: primaryColor }}>CORE</span></h2>
        <div className="flex gap-4 glass p-2 rounded-2xl">
          {(['profile', 'branding', 'payments', 'security'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveSubTab(t)}
              className={`px-6 py-2 rounded-xl font-rajdhani text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSubTab === t ? 'bg-white text-black shadow-xl' : 'text-gray-500 hover:text-white'
              }`}
            >
              {t === 'profile' ? 'PERFIL' : t === 'branding' ? 'DISEÑO' : t === 'payments' ? 'PAGOS' : 'SEGURIDAD'}
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

            {activeSubTab === 'payments' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bebas text-2xl tracking-wide uppercase">MÉTODOS DE PAGO ACEPTADOS</p>
                    <p className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-widest">SE MUESTRAN AL COMPRADOR EN LA VISTA PÚBLICA</p>
                  </div>
                  <button type="button" onClick={addPayment} className="px-5 py-3 rounded-xl font-bebas text-sm tracking-widest uppercase flex items-center gap-2" style={{ backgroundColor: primaryColor, color: '#000' }}>
                    <Plus className="w-4 h-4" /> AÑADIR
                  </button>
                </div>
                {paymentList.length === 0 && (
                  <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
                    <p className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-widest">SIN MÉTODOS DE PAGO. AÑADE AL MENOS UNO.</p>
                  </div>
                )}
                {paymentList.map((p, i) => (
                  <div key={i} className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select value={p.type} onChange={(e) => updatePayment(i, 'type', e.target.value)} className="h-12 bg-white/5 border border-white/10 rounded-xl px-4 font-rajdhani text-sm text-white focus:border-[#00D1FF] outline-none">
                        <option value="bank">TRANSFERENCIA BANCARIA</option>
                        <option value="cash">EFECTIVO / CONTRA ENTREGA</option>
                        <option value="paypal">PAYPAL</option>
                        <option value="zelle">ZELLE</option>
                        <option value="other">OTRO</option>
                      </select>
                      <input value={p.label} onChange={(e) => updatePayment(i, 'label', e.target.value)} placeholder="ETIQUETA (EJ: BANRESERVAS)" className="h-12 bg-white/5 border border-white/10 rounded-xl px-4 font-rajdhani text-sm text-white focus:border-[#00D1FF] outline-none" />
                    </div>
                    <textarea value={p.details} onChange={(e) => updatePayment(i, 'details', e.target.value)} placeholder="DETALLES (NÚMERO DE CUENTA, INSTRUCCIONES, ETC)" className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-4 font-rajdhani text-sm text-white focus:border-[#00D1FF] outline-none resize-none" />
                    <button type="button" onClick={() => removePayment(i)} className="text-red-400 font-rajdhani text-[10px] font-bold uppercase tracking-widest hover:text-red-300">ELIMINAR</button>
                  </div>
                ))}
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
             <button className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-green-500 transition-colors">
                <MessageSquare className="w-4 h-4" />
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

function SkeletonCard() {
  return <div className="aspect-[3/4] glass rounded-[32px] animate-pulse" />;
}

function CreateProductModal({ onClose, onSubmit, color }: any) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [b2bPrice, setB2bPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const submit = async () => {
    if (!name.trim() || !basePrice) return;
    setSubmitting(true);

    let finalImageUrl = imageUrl;
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const token = getToken();
        const res = await fetch(`${API_BASE}/api/products/upload`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });
        const data = await res.json();
        finalImageUrl = data.url;
      } catch (err) {
        console.error('Upload failed', err);
      }
    }

    await onSubmit({
      name: name.trim(),
      sku: sku.trim() || null,
      basePrice,
      b2bPrice: b2bPrice || null,
      imageUrl: finalImageUrl.trim() || null,
      description: description.trim() || null,
    });
    setSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-white/60 backdrop-blur-xl" onClick={onClose} />
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-white p-10 rounded-[40px] w-full max-w-2xl space-y-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
        <div>
          <h3 className="text-3xl font-black tracking-tight">Nuevo Producto</h3>
          <p className="text-sm font-medium text-gray-400 mt-1">Completa los datos para tu inventario</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Imagen del Producto</label>
              <div className="aspect-square bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer">
                {file ? (
                  <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-[10px] font-bold text-gray-400">SUBIR FOTO</p>
                  </>
                )}
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Nombre *</label>
              <input className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-[#FACD01]/50 transition-all" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Camiseta" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">SKU</label>
                <input className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 text-sm font-bold outline-none" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="001" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Precio *</label>
                <input type="number" className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 text-sm font-bold outline-none" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Descripción</label>
              <textarea className="w-full h-24 bg-gray-50 border-none rounded-xl p-4 text-sm font-bold outline-none resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="..." />
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button onClick={onClose} disabled={submitting} className="flex-1 py-4 text-gray-400 font-bold text-sm">Cancelar</button>
          <button 
            onClick={submit} 
            disabled={submitting || !name.trim() || !basePrice} 
            className="flex-1 py-4 bg-[#FACD01] text-black rounded-xl font-bold text-sm shadow-lg shadow-yellow-100 disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Crear Producto'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
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
