'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, User, Plus, Package, FileText, LayoutGrid,
  Settings, Home, ShoppingCart, LogIn, Camera, Maximize2,
  ChevronRight, ExternalLink, X, Bell, LogOut, BarChart3,
  Box, ArrowRight, Zap, Globe, ArrowLeft, Lock, Mail, ClipboardCheck, Share2,
  Instagram, MapPin, Phone, MessageSquare, Layout, Palette,
  TrendingUp, Users, DollarSign, Filter, Edit2, Menu
} from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';

// Nuevos Módulos Refactorizados
import { HomeView } from '../../components/dashboard/HomeView';
import { ProductsView } from '../../components/dashboard/ProductsView';
import { CatalogsView } from '../../components/dashboard/CatalogsView';
import { OrdersView } from '../../components/dashboard/OrdersView';
import { ClientsView } from '../../components/dashboard/ClientsView';
import { TenantsView } from '../../components/dashboard/TenantsView';
import { SettingsView } from '../../components/dashboard/SettingsView';
import { CreateProductModal, CreateCatalogModal, CreateTenantModal } from '../../components/dashboard/Modals';

const getApiBase = () => {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_URL || 'https://api.catagce.renace.tech';
  return 'https://api.catagce.renace.tech';
};

const API_BASE = getApiBase();

type Tab = 'home' | 'products' | 'catalogs' | 'orders' | 'settings' | 'clients' | 'tenants';

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
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error('API Error');
  return res.json();
}

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [isCreateTenantOpen, setIsCreateTenantOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const t = getToken();
    if (!t) window.location.href = '/login';
    else setToken(t);
  }, []);

  const loadProfile = async () => {
    try {
      const data = await fetchWithAuth('/sellers/profile');
      setProfile(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await fetchWithAuth('/products');
      setProducts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCatalogs = async () => {
    setCatalogLoading(true);
    try {
      const data = await fetchWithAuth('/catalogs');
      setCatalogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCatalogLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const data = await fetchWithAuth('/orders');
      setOrders(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token) {
      loadProfile();
      loadProducts();
      loadCatalogs();
      loadOrders();
      setLoading(false);
    }
  }, [token]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('ENLACE COPIADO');
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
      showToast('ERROR AL CREAR');
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

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿ESTÁS SEGURO DE ELIMINAR ESTE PRODUCTO?')) return;
    try {
      await fetchWithAuth(`/products/${id}`, { method: 'DELETE' });
      loadProducts();
      showToast('PRODUCTO ELIMINADO');
    } catch {
      showToast('ERROR AL ELIMINAR');
    }
  };

  const handleDeleteCatalog = async (id: string) => {
    if (!confirm('¿ELIMINAR TODO EL CATÁLOGO? ESTO NO BORRA LOS PRODUCTOS.')) return;
    try {
      await fetchWithAuth(`/catalogs/${id}`, { method: 'DELETE' });
      setSelectedCatalog(null);
      loadCatalogs();
      showToast('CATÁLOGO ELIMINADO');
    } catch {
      showToast('ERROR AL ELIMINAR');
    }
  };

  const handleCreateSeller = async (data: any) => {
    try {
      await fetchWithAuth('/sellers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setIsCreateTenantOpen(false);
      showToast('NUEVO SELLER CREADO');
    } catch {
      showToast('ERROR AL CREAR SELLER');
    }
  };

  const handleUpdateBranding = async (data: any) => {
    try {
      await fetchWithAuth('/sellers/branding', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      loadProfile();
      showToast('AJUSTES GUARDADOS');
    } catch {
      showToast('ERROR AL GUARDAR');
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: string) => {
    try {
      await fetchWithAuth(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadOrders();
      showToast(`PEDIDO ${status.toUpperCase()}`);
    } catch {
      showToast('ERROR AL ACTUALIZAR');
    }
  };

  const handleAddProductToCatalog = async (catalogId: string, productId: string) => {
    try {
      await fetchWithAuth(`/catalogs/${catalogId}/products`, {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
      loadCatalogs();
      showToast('AÑADIDO AL CATÁLOGO');
    } catch {
      showToast('ERROR AL AÑADIR');
    }
  };

  const primaryColor = profile?.branding?.primaryColor || '#FACD01';

  if (!token) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-rajdhani selection:bg-[#FACD01] selection:text-black">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FACD01]/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00D1FF]/5 blur-[120px] rounded-full animate-pulse" />
      </div>

      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 z-50 w-80 bg-black/40 backdrop-blur-3xl border-r border-white/5 p-8 flex flex-col transition-transform duration-500 lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-4 mb-16 px-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FACD01] to-[#FF9000] p-3 shadow-[0_0_20px_rgba(250,205,1,0.3)]">
            <Zap className="w-full h-full text-black fill-current" />
          </div>
          <div>
            <h1 className="text-3xl font-bebas tracking-widest leading-none">CATAGCE</h1>
            <p className="text-[10px] font-black text-gray-500 tracking-[0.3em] mt-1 uppercase">SaaS Engine</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem icon={<Home className="w-5 h-5" />} label="Dashboard" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavItem icon={<Box className="w-5 h-5" />} label="Inventario" active={activeTab === 'products'} onClick={() => setActiveTab('products')} />
          <NavItem icon={<Layout className="w-5 h-5" />} label="Catálogos" active={activeTab === 'catalogs'} onClick={() => setActiveTab('catalogs')} />
          <NavItem icon={<ShoppingCart className="w-5 h-5" />} label="Pedidos" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
          <NavItem icon={<Users className="w-5 h-5" />} label="Clientes" active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} />
          {profile?.role === 'admin' && (
             <NavItem icon={<Globe className="w-5 h-5" />} label="Tenants" active={activeTab === 'tenants'} onClick={() => setActiveTab('tenants')} />
          )}
          <div className="pt-8 mt-8 border-t border-white/5">
            <NavItem icon={<Settings className="w-5 h-5" />} label="Configuración" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </div>
        </nav>

        <div className="mt-auto px-4">
          <div className="glass p-6 rounded-3xl relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('settings')}>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg">
                {profile?.name?.substring(0, 1).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-sm font-bold uppercase truncate max-w-[120px]">{profile?.name || 'Cargando...'}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{profile?.role || 'User'}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-80 min-h-screen">
        <header className="h-24 border-b border-white/5 flex items-center justify-between px-8 lg:px-12 sticky top-0 bg-[#0A0A0A]/60 backdrop-blur-xl z-30">
          <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden w-12 h-12 flex items-center justify-center hover:bg-white/5 rounded-2xl transition-all">
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1 max-w-xl mx-8 hidden md:block">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#FACD01] transition-colors" />
              <input 
                type="text" 
                placeholder="BUSCAR EN EL SISTEMA..." 
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-xs font-bold tracking-widest uppercase focus:border-[#FACD01]/40 focus:bg-white/[0.08] transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="w-12 h-12 flex items-center justify-center hover:bg-white/5 rounded-2xl relative transition-all group">
              <Bell className="w-5 h-5 text-gray-400 group-hover:text-white" />
              <div className="absolute top-3 right-3 w-2 h-2 bg-[#FACD01] rounded-full border-2 border-[#0A0A0A]" />
            </button>
            <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />
            <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase hidden sm:block">UPTIME: 99.9%</p>
          </div>
        </header>

        <div className="p-8 lg:p-12 max-w-[1400px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedCatalog?.id || '')}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'home' && <HomeView products={products} orders={orders} loading={loading} color={primaryColor} onCreate={() => setActiveTab('products')} onExportPdf={() => showToast('GENERANDO PDF...')} />}
              {activeTab === 'products' && <ProductsView products={products} loading={loading} color={primaryColor} onCreate={() => setIsCreateProductOpen(true)} onDelete={handleDeleteProduct} />}
              {activeTab === 'catalogs' && (
                <CatalogsView
                  catalogs={catalogs}
                  products={products}
                  loading={catalogLoading}
                  selected={selectedCatalog}
                  color={primaryColor}
                  onSelect={setSelectedCatalog}
                  onClose={() => setSelectedCatalog(null)}
                  onDelete={handleDeleteCatalog}
                  onOrder={(slug: string) => window.open(`/order/${slug}`, '_blank')}
                  onShare={(slug: string) => copyToClipboard(`${window.location.origin}/order/${slug}`)}
                  onCreate={() => setIsCreateModalOpen(true)}
                  onAddProduct={handleAddProductToCatalog}
                />
              )}
              {activeTab === 'orders' && <OrdersView orders={orders} loading={loading} color={primaryColor} onUpdateStatus={handleUpdateOrderStatus} />}
              {activeTab === 'clients' && <ClientsView color={primaryColor} orders={orders} />}
              {activeTab === 'tenants' && <TenantsView color={primaryColor} onCreate={() => setIsCreateTenantOpen(true)} />}
              {activeTab === 'settings' && (
                <SettingsView 
                  profile={profile} 
                  onUpdate={handleUpdateBranding} 
                  onLogout={() => { localStorage.removeItem('catagce_token'); setToken(null); window.location.href='/login'; }} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Global Modals */}
      <AnimatePresence>
        {isCreateProductOpen && <CreateProductModal onClose={() => setIsCreateProductOpen(false)} onSubmit={handleCreateProduct} color={primaryColor} />}
        {isCreateModalOpen && <CreateCatalogModal onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateCatalog} color={primaryColor} />}
        {isCreateTenantOpen && <CreateTenantModal onClose={() => setIsCreateTenantOpen(false)} onSubmit={handleCreateSeller} />}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200]">
            <div className="glass px-8 py-4 rounded-2xl flex items-center gap-4 border-[#FACD01]/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <div className="w-2 h-2 rounded-full bg-[#FACD01] animate-ping" />
              <p className="font-bebas text-lg tracking-widest text-[#FACD01] uppercase">{toast}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${
        active 
          ? 'bg-[#FACD01] text-black shadow-[0_10px_20px_rgba(250,205,1,0.2)]' 
          : 'text-gray-500 hover:text-white hover:bg-white/5'
      }`}
    >
      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      <span className="text-xs font-black uppercase tracking-[0.2em]">{label}</span>
      {active && (
        <motion.div layoutId="nav-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-black" />
      )}
    </button>
  );
}
