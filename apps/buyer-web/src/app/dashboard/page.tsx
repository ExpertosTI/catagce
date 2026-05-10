'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, User, Plus, Package, FileText, LayoutGrid,
  Settings, Home, ShoppingCart, LogIn, Camera, Maximize2,
  ChevronRight, ExternalLink, X,
} from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop';

type Tab = 'home' | 'products' | 'catalogs' | 'orders' | 'settings';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('catagce_token');
}

async function fetchWithAuth(path: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/* ── Skeleton card ─────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-[#141414] rounded-[1.6rem] overflow-hidden border border-white/5 animate-pulse">
      <div className="aspect-square bg-white/5" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-white/5 rounded-lg w-3/4" />
        <div className="h-3 bg-white/5 rounded-lg w-1/2" />
        <div className="h-9 bg-white/5 rounded-xl mt-2" />
      </div>
    </div>
  );
}

/* ── Product card ──────────────────────────────────────────── */
function ProductCard({ product }: { product: any }) {
  const stock = product.stockLevels?.[0]?.onHandBase ?? 0;
  const cajas = Math.floor(stock / 12);
  const nameParts = (product.name ?? '').split(' - ');
  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="bg-[#141414] rounded-[1.6rem] overflow-hidden border border-white/5"
    >
      <div className="aspect-square relative">
        <img
          src={product.imageUrl ?? FALLBACK_IMG}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
        />
        <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button aria-label="Foto" className="w-7 h-7 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/70 transition-colors">
            <Camera className="w-3.5 h-3.5 text-white/80" />
          </button>
          <button aria-label="Expandir" className="w-7 h-7 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/70 transition-colors">
            <Maximize2 className="w-3.5 h-3.5 text-white/80" />
          </button>
        </div>
        <div className="absolute top-2.5 right-2.5 flex gap-1.5">
          <div className="w-7 h-7 bg-black/40 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <Camera className="w-3.5 h-3.5 text-white/70" />
          </div>
          <div className="w-7 h-7 bg-black/40 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <Maximize2 className="w-3.5 h-3.5 text-white/70" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-3">
          <p className="text-sm font-bold leading-tight">
            {nameParts[0]}
            {nameParts[1] && <span className="text-[#00D1FF]"> - {nameParts[1]}</span>}
          </p>
        </div>
      </div>
      <div className="p-3 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-base font-bold">${product.basePrice} USD</p>
            <p className="text-xs text-gray-400 mt-0.5">
              STOCK: {stock} {product.baseUom?.symbol ?? 'un'}
            </p>
          </div>
          <div className="flex gap-1.5 text-[10px] text-gray-500">
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-5 h-5 bg-white/5 rounded-md flex items-center justify-center">
                <LayoutGrid className="w-2.5 h-2.5" />
              </div>
              <span>Cajas {cajas}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-5 h-5 bg-white/5 rounded-md flex items-center justify-center">
                <LayoutGrid className="w-2.5 h-2.5" />
              </div>
              <span>Doc. {cajas}</span>
            </div>
          </div>
        </div>
        <button className="w-full py-2.5 bg-[#00D1FF] text-black text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all">
          <Plus className="w-4 h-4" /> Añadir Stock
        </button>
      </div>
    </motion.div>
  );
}

/* ── Catalog panel product mini-card ───────────────────────── */
function CatalogProductCard({ cp, onOrder }: { cp: any; onOrder: () => void }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      <div className="aspect-square relative">
        <img
          src={cp.product?.imageUrl ?? FALLBACK_IMG}
          alt={cp.product?.name}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
        />
      </div>
      <div className="p-2.5">
        <p className="text-xs font-bold text-gray-900 leading-tight truncate">{cp.product?.name}</p>
        <p className="text-[10px] text-gray-400 truncate">{cp.sellerName}</p>
        <p className="text-xs font-bold text-gray-800 mt-1">${cp.product?.basePrice} USD</p>
        <button
          onClick={onOrder}
          className="mt-2 w-full py-2 bg-[#00D1FF] text-black text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 hover:brightness-110 active:scale-95 transition-all"
        >
          Ver Producto y Pedir <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

/* ── Tab content variants ──────────────────────────────────── */
const tabVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

const TAB_ORDER: Tab[] = ['home', 'products', 'catalogs', 'orders', 'settings'];

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [slug, setSlug] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedCatalog, setSelectedCatalog] = useState<any | null>(null);
  const [toast, setToast] = useState('');
  const prevTabIndex = useRef(0);

  const tabIndex = TAB_ORDER.indexOf(activeTab);
  const direction = tabIndex - prevTabIndex.current;

  const switchTab = (tab: Tab) => {
    prevTabIndex.current = TAB_ORDER.indexOf(activeTab);
    setActiveTab(tab);
  };

  useEffect(() => { setToken(getToken()); }, []);

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
    if (catalogs.length > 0) return;
    setCatalogLoading(true);
    try {
      const data = await fetchWithAuth('/catalogs');
      setCatalogs(data);
    } catch {
      setCatalogs([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [catalogs.length]);

  useEffect(() => {
    if (token) loadProducts();
    else setLoading(false);
  }, [token, loadProducts]);

  useEffect(() => {
    if (token && activeTab === 'catalogs') loadCatalogs();
  }, [activeTab, token, loadCatalogs]);

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
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) throw new Error('Not found');
      const { token: newToken } = await res.json();
      localStorage.setItem('catagce_token', newToken);
      setToken(newToken);
    } catch {
      setLoginError('Vendedor no encontrado. Verifica el slug.');
    }
  };

  /* ── Login ───────────────────────────────────────────────── */
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-[#141414] border border-white/8 rounded-3xl p-8 space-y-6 shadow-2xl"
        >
          <div className="flex items-center gap-2">
            <LogoMark />
            <span className="text-xl font-bold tracking-tight text-white">
              Catálogo<span className="text-[#00D1FF]">Pro</span>
            </span>
          </div>
          <p className="text-gray-400 text-sm">Ingresa el slug de tu tienda para continuar.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-2xl focus:border-[#00D1FF] focus:outline-none text-white placeholder:text-gray-600 transition-colors"
              placeholder="renace-demo"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              autoComplete="off"
            />
            <AnimatePresence>
              {loginError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-red-400 text-xs"
                >
                  {loginError}
                </motion.p>
              )}
            </AnimatePresence>
            <button
              type="submit"
              className="w-full py-3 bg-[#00D1FF] text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
            >
              <LogIn className="w-4 h-4" /> Entrar
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  /* ── Dashboard shell ─────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white pb-32 overflow-x-hidden">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-[#1e1e1e] border border-white/10 px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl text-white"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <header className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <LogoMark />
          <h1 className="text-lg font-bold tracking-tight">
            Catálogo<span className="text-[#00D1FF]">Pro</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => switchTab('home')}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
            aria-label="Buscar"
          >
            <Search className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={() => { localStorage.removeItem('catagce_token'); setToken(null); showToast('Sesión cerrada'); }}
            className="relative w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/10 hover:border-red-500/40 transition-colors"
            aria-label="Cerrar sesión"
          >
            <User className="w-5 h-5 text-gray-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0D0D0D]" />
          </button>
        </div>
      </header>

      {/* Tab content */}
      <main className="px-4 md:px-8 relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            variants={tabVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* ─── HOME ───────────────────────────────────────── */}
            {activeTab === 'home' && (
              <HomeView
                products={products}
                loading={loading}
                onExportPdf={() => showToast('Generando PDF...')}
              />
            )}

            {/* ─── PRODUCTS ───────────────────────────────────── */}
            {activeTab === 'products' && (
              <ProductsView
                products={products}
                loading={loading}
                onAdd={() => showToast('Funcionalidad próximamente')}
              />
            )}

            {/* ─── CATALOGS ───────────────────────────────────── */}
            {activeTab === 'catalogs' && (
              <CatalogsView
                catalogs={catalogs}
                loading={catalogLoading}
                selected={selectedCatalog}
                onSelect={setSelectedCatalog}
                onClose={() => setSelectedCatalog(null)}
                onOrder={(slug) => { window.open(`/order/${slug}`, '_blank'); }}
              />
            )}

            {/* ─── ORDERS ─────────────────────────────────────── */}
            {activeTab === 'orders' && <OrdersView />}

            {/* ─── SETTINGS ───────────────────────────────────── */}
            {activeTab === 'settings' && (
              <SettingsView onLogout={() => { localStorage.removeItem('catagce_token'); setToken(null); }} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FAB — only on home/products */}
      <AnimatePresence>
        {(activeTab === 'home' || activeTab === 'products') && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-28 right-5 flex flex-col items-center gap-2 z-50"
          >
            <button
              aria-label="Agregar nuevo producto"
              onClick={() => showToast('Formulario de producto próximamente')}
              className="w-16 h-16 bg-gradient-to-br from-[#FF8A00] to-[#FF5C00] rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(255,138,0,0.4)] hover:scale-110 active:scale-95 transition-transform"
            >
              <Plus className="w-8 h-8 text-white" />
            </button>
            <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">Nuevo Producto</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 px-4 pb-4 z-40">
        <div className="max-w-lg mx-auto bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/8 rounded-[1.6rem] px-4 py-3 flex justify-around items-center shadow-2xl">
          <NavItem icon={<Home className="w-5 h-5" />} label="Home" active={activeTab === 'home'} onClick={() => switchTab('home')} />
          <NavItem icon={<LayoutGrid className="w-5 h-5" />} label="Productos" active={activeTab === 'products'} onClick={() => switchTab('products')} />
          <NavItem icon={<Package className="w-5 h-5" />} label="Catálogos" active={activeTab === 'catalogs'} onClick={() => switchTab('catalogs')} />
          <NavItem icon={<ShoppingCart className="w-5 h-5" />} label="Pedidos" active={activeTab === 'orders'} onClick={() => switchTab('orders')} />
          <NavItem icon={<Settings className="w-5 h-5" />} label="Config" active={activeTab === 'settings'} onClick={() => switchTab('settings')} />
        </div>
      </nav>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB VIEWS
══════════════════════════════════════════════════════════════ */

function HomeView({ products, loading, onExportPdf }: { products: any[]; loading: boolean; onExportPdf: () => void }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-5 px-1">Productos</h2>
      <div className="grid grid-cols-2 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : products.length === 0
          ? <p className="col-span-2 text-gray-500 text-sm text-center mt-16">No hay productos aún.</p>
          : products.map((p) => <ProductCard key={p.id} product={p} />)
        }
      </div>
      <div className="mt-6 pb-4">
        <button
          onClick={onExportPdf}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF8A00] to-[#FF5C00] px-5 py-3.5 rounded-2xl font-bold text-sm shadow-[0_4px_20px_rgba(255,138,0,0.25)] hover:scale-[1.02] active:scale-95 transition-transform"
        >
          <FileText className="w-5 h-5" /> Exportar a PDF
        </button>
      </div>
    </div>
  );
}

function ProductsView({ products, loading, onAdd }: { products: any[]; loading: boolean; onAdd: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5 px-1">
        <h2 className="text-xl font-bold">Todos los Productos</h2>
        <span className="text-xs text-gray-500">{products.length} items</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : products.map((p) => <ProductCard key={p.id} product={p} />)
        }
      </div>
    </div>
  );
}

function CatalogsView({
  catalogs, loading, selected, onSelect, onClose, onOrder,
}: {
  catalogs: any[]; loading: boolean; selected: any | null;
  onSelect: (c: any) => void; onClose: () => void; onOrder: (slug: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-5 px-1">Catálogos</h2>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-[#141414] rounded-2xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : catalogs.length === 0 ? (
        <p className="text-gray-500 text-sm text-center mt-16">No hay catálogos aún.</p>
      ) : (
        <div className="space-y-3">
          {catalogs.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelect(cat)}
              className="w-full flex items-center gap-4 p-4 bg-[#141414] border border-white/5 rounded-2xl hover:border-white/15 active:scale-[0.98] transition-all text-left"
            >
              <div className="w-12 h-12 bg-[#00D1FF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-[#00D1FF]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{cat.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {cat.catalogProducts?.length ?? 0} productos · /{cat.slug}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
            </motion.button>
          ))}
        </div>
      )}

      {/* ─── Catalog detail panel ─── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 35 }}
            className="fixed inset-0 bg-white z-50 overflow-y-auto pb-8"
          >
            {/* Panel header */}
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div className="flex-1 pr-4">
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-1">Catálogo</p>
                <h3 className="text-gray-900 font-bold text-lg leading-tight">{selected.name}</h3>
                <p className="text-xs text-gray-400 mt-1">Catálogo de Catagce Bros</p>
              </div>
              <div className="flex gap-2 mt-1">
                <button aria-label="Buscar en catálogo" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <Search className="w-4 h-4 text-gray-600" />
                </button>
                <button aria-label="Cerrar" onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Panel product grid */}
            <div className="p-4 grid grid-cols-2 gap-3">
              {(selected.catalogProducts ?? []).map((cp: any) => (
                <CatalogProductCard key={cp.id} cp={cp} onOrder={() => onOrder(selected.slug)} />
              ))}
            </div>

            {/* Footer CTA */}
            <div className="px-4 mt-2 space-y-3">
              <button
                onClick={() => onOrder(selected.slug)}
                className="w-full py-3.5 bg-[#00D1FF] text-black font-bold rounded-2xl flex items-center justify-center gap-2 text-sm hover:brightness-110 active:scale-95 transition-all"
              >
                Comprar Ahora <ChevronRight className="w-4 h-4" />
              </button>
              <button className="w-full flex items-center justify-center gap-2 text-gray-500 text-xs hover:text-gray-800 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
                Ver Catálogo Completo de Línea
              </button>
              <p className="text-center text-[10px] text-gray-400 mt-1">
                Powered by <span className="font-bold text-gray-600">CatálogoPro</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OrdersView() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-5 px-1">Pedidos</h2>
      <div className="flex flex-col items-center justify-center mt-24 gap-4">
        <div className="w-16 h-16 bg-[#141414] rounded-2xl flex items-center justify-center border border-white/5">
          <ShoppingCart className="w-8 h-8 text-gray-600" />
        </div>
        <p className="text-gray-500 text-sm text-center">Aún no hay pedidos recibidos.</p>
        <p className="text-gray-700 text-xs text-center max-w-xs">
          Cuando tus compradores envíen pedidos desde el catálogo, aparecerán aquí.
        </p>
      </div>
    </div>
  );
}

function SettingsView({ onLogout }: { onLogout: () => void }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-5 px-1">Configuración</h2>
      <div className="space-y-3">
        {[
          { label: 'Perfil de tienda', sub: 'Nombre, logo, contacto' },
          { label: 'Dominio personalizado', sub: 'catagce.renace.tech' },
          { label: 'Notificaciones', sub: 'WhatsApp, email' },
        ].map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center justify-between p-4 bg-[#141414] border border-white/5 rounded-2xl hover:border-white/15 active:scale-[0.98] transition-all text-left"
          >
            <div>
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        ))}
        <button
          onClick={onLogout}
          className="w-full mt-4 py-3.5 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-2xl text-sm hover:bg-red-500/20 active:scale-95 transition-all"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SHARED COMPONENTS
══════════════════════════════════════════════════════════════ */

function LogoMark() {
  return (
    <div className="w-8 h-8 bg-[#00D1FF] rounded-lg flex items-center justify-center flex-shrink-0">
      <span className="text-black font-black text-base leading-none">C</span>
    </div>
  );
}

function NavItem({
  icon, label, active = false, onClick,
}: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors relative ${
        active ? 'text-[#FF8A00]' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {active && (
        <motion.span
          layoutId="nav-indicator"
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-1 bg-[#FF8A00] rounded-full"
        />
      )}
      {icon}
      <span className="text-[9px] font-medium">{label}</span>
    </button>
  );
}
