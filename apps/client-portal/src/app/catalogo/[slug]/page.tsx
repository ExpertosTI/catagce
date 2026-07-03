'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, Minus, Plus, ArrowLeft, CheckCircle, X, Loader2, Search,
  Package, BookOpen, Lock, ShoppingBag,
} from 'lucide-react';
import { publicFetch, apiFetch, getToken } from '../../../lib/api';
import { formatCurrency } from '../../../lib/currency';
import { COMPANY_SLUG } from '../../../lib/site';

type CatalogData = {
  company: { name: string };
  catalog: { id: string; name: string; description?: string; isPresale?: boolean };
  items: { productId: string; sku: string; name: string; description?: string; price: number; imageUrl?: string }[];
};

type CartItem = { productId: string; name: string; price: number; quantity: number };

function CartPanel({
  cart,
  total,
  ordering,
  onClose,
  onUpdateQty,
  onCheckout,
  className = '',
}: {
  cart: CartItem[];
  total: number;
  ordering: boolean;
  onClose: () => void;
  onUpdateQty: (productId: string, delta: number) => void;
  onCheckout: () => void;
  className?: string;
}) {
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0);
  const loggedIn = Boolean(getToken());

  return (
    <div className={`cart-panel ${className}`}>
      <div className="cart-panel-header">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingCart size={20} className="text-blue-600" /> Su pedido
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{itemCount} artículo{itemCount !== 1 ? 's' : ''}</p>
        </div>
        <button type="button" onClick={onClose} className="cart-panel-close" aria-label="Cerrar carrito">
          <X size={22} />
        </button>
      </div>

      <div className="cart-panel-body">
        {!cart.length ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 text-slate-500">
            <ShoppingCart size={40} className="text-slate-300 mb-3" />
            <p className="font-medium">Carrito vacío</p>
            <p className="text-sm mt-1">Agregue productos del catálogo</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {cart.map((c) => (
              <li key={c.productId} className="flex items-center justify-between gap-3 text-sm border-b border-slate-100 pb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 truncate">{c.name}</p>
                  <p className="text-slate-500 tabular-nums">{formatCurrency(c.price)} c/u</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => onUpdateQty(c.productId, -1)} className="cart-qty-btn"><Minus size={16} /></button>
                  <span className="w-8 text-center font-semibold tabular-nums">{c.quantity}</span>
                  <button type="button" onClick={() => onUpdateQty(c.productId, 1)} className="cart-qty-btn"><Plus size={16} /></button>
                </div>
                <p className="font-bold text-blue-700 w-24 text-right shrink-0 tabular-nums">{formatCurrency(c.price * c.quantity)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {cart.length > 0 && (
        <div className="cart-panel-footer">
          <div className="flex justify-between items-center font-bold text-lg mb-4">
            <span>Total</span>
            <span className="text-blue-700 tabular-nums">{formatCurrency(total)}</span>
          </div>
          <button type="button" onClick={onCheckout} disabled={ordering} className="btn-primary w-full py-3.5 text-base disabled:opacity-50">
            {ordering && <Loader2 size={18} className="animate-spin" />}
            {!ordering && !loggedIn && <Lock size={18} />}
            {!ordering && loggedIn && <CheckCircle size={18} />}
            {ordering ? 'Procesando...' : loggedIn ? 'Confirmar preventa' : 'Iniciar sesión para pedir'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function CatalogPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [data, setData] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    publicFetch<CatalogData>(`/public/company/${COMPANY_SLUG}/catalog/${params.slug}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.slug]);

  useEffect(() => {
    document.body.style.overflow = showCart ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showCart]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !data) return data?.items ?? [];
    return data.items.filter((i) =>
      i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q),
    );
  }, [data, query]);

  function addToCart(item: CatalogData['items'][0]) {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === item.productId);
      if (existing) {
        return prev.map((c) => c.productId === item.productId ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { productId: item.productId, name: item.name, price: item.price, quantity: 1 }];
    });
    setShowCart(true);
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) => prev
      .map((c) => c.productId === productId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
      .filter((c) => c.quantity > 0));
  }

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  async function checkout() {
    if (!getToken()) {
      router.push(`/login?redirect=/catalogo/${params.slug}`);
      return;
    }
    setOrdering(true);
    try {
      await apiFetch('/portal/presales', {
        method: 'POST',
        body: JSON.stringify({
          catalogId: data?.catalog.id,
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, unitPrice: c.price })),
          notes: `Pedido desde catálogo ${params.slug}`,
        }),
      });
      setSuccess('¡Preventa registrada! Un asesor confirmará su pedido.');
      setCart([]);
      setShowCart(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al procesar pedido');
    } finally {
      setOrdering(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-10 max-w-md text-center shadow-xl">
          <CheckCircle className="mx-auto text-emerald-600 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-900">{success}</h2>
          <p className="text-sm text-slate-500 mt-2">Recibirá confirmación cuando procesemos su pedido.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/portal" className="btn-primary">Ir al portal</Link>
            <Link href="/" className="btn-secondary">Inicio</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-blue-700 text-sm min-w-0 transition">
            <ArrowLeft size={16} className="shrink-0" />
            <span className="truncate font-medium">{data?.company.name || 'GHome'}</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowCart(true)}
            className="relative btn-secondary text-sm py-2.5 px-4 flex items-center gap-2 shrink-0"
          >
            <ShoppingCart size={18} />
            <span className="hidden sm:inline">Carrito</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-700 text-white text-xs min-w-[1.25rem] h-5 px-1 rounded-full flex items-center justify-center font-bold tabular-nums">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap gap-2 mb-3">
            {data?.catalog.isPresale ? (
              <span className="badge-amber flex items-center gap-1"><ShoppingBag size={12} /> Preventa</span>
            ) : (
              <span className="badge-blue flex items-center gap-1"><BookOpen size={12} /> Catálogo</span>
            )}
            {data && <span className="text-xs text-slate-400 self-center">{data.items.length} productos</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {loading ? 'Cargando...' : data?.catalog.name || 'Catálogo'}
          </h1>
          {data?.catalog.description && (
            <p className="text-slate-600 mt-2 text-sm sm:text-base max-w-2xl">{data.catalog.description}</p>
          )}
        </div>

        {!loading && data && data.items.length > 3 && (
          <div className="relative mb-6 max-w-md">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input-search"
              placeholder="Buscar producto..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}

        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-72 animate-pulse bg-slate-100" />
            ))}
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="executive-card p-12 text-center text-slate-500">
            {query ? 'Sin productos que coincidan' : 'Este catálogo no tiene productos'}
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredItems.map((item) => (
            <article key={item.productId} className="product-card">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-40 sm:h-44 object-cover" />
              ) : (
                <div className="w-full h-40 sm:h-44 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                  <Package size={40} className="text-slate-300" />
                </div>
              )}
              <div className="p-4">
                <p className="text-xs text-slate-400 font-mono">{item.sku}</p>
                <h3 className="font-semibold mt-1 line-clamp-2 text-slate-900">{item.name}</h3>
                {item.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                )}
                <p className="text-blue-700 font-extrabold text-lg mt-2 tabular-nums">{formatCurrency(item.price)}</p>
                <button type="button" onClick={() => addToCart(item)} className="btn-primary w-full mt-3 text-sm py-2.5">
                  <ShoppingCart size={16} /> Agregar al carrito
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {showCart && (
        <>
          <button
            type="button"
            className="cart-backdrop lg:hidden"
            aria-label="Cerrar carrito"
            onClick={() => setShowCart(false)}
          />
          <CartPanel
            cart={cart}
            total={total}
            ordering={ordering}
            onClose={() => setShowCart(false)}
            onUpdateQty={updateQty}
            onCheckout={checkout}
            className="cart-panel-mobile lg:hidden"
          />
        </>
      )}

      {showCart && (
        <CartPanel
          cart={cart}
          total={total}
          ordering={ordering}
          onClose={() => setShowCart(false)}
          onUpdateQty={updateQty}
          onCheckout={checkout}
          className="cart-panel-desktop hidden lg:flex"
        />
      )}
    </div>
  );
}
