'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Minus, Plus, ArrowLeft, CheckCircle, X } from 'lucide-react';
import { publicFetch, apiFetch, getToken } from '../../../lib/api';
import { COMPANY_SLUG } from '../../../lib/site';

type CatalogData = {
  company: { name: string };
  catalog: { id: string; name: string; description?: string; isPresale?: boolean };
  items: { productId: string; sku: string; name: string; description?: string; price: number; imageUrl?: string }[];
};

type CartItem = { productId: string; name: string; price: number; quantity: number };

const COMPANY_SLUG_CONST = COMPANY_SLUG;

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

  return (
    <div className={`cart-panel ${className}`}>
      <div className="cart-panel-header">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2">
            <span aria-hidden>🛒</span> Su pedido
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
            <p className="text-4xl mb-3" aria-hidden>🛒</p>
            <p className="font-medium">Carrito vacío</p>
            <p className="text-sm mt-1">Agregue productos del catálogo</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {cart.map((c) => (
              <li key={c.productId} className="flex items-center justify-between gap-3 text-sm border-b border-slate-100 pb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 truncate">{c.name}</p>
                  <p className="text-slate-500">${c.price.toFixed(2)} c/u</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => onUpdateQty(c.productId, -1)} className="cart-qty-btn"><Minus size={16} /></button>
                  <span className="w-8 text-center font-semibold">{c.quantity}</span>
                  <button type="button" onClick={() => onUpdateQty(c.productId, 1)} className="cart-qty-btn"><Plus size={16} /></button>
                </div>
                <p className="font-bold text-blue-700 w-20 text-right shrink-0">${(c.price * c.quantity).toFixed(2)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {cart.length > 0 && (
        <div className="cart-panel-footer">
          <div className="flex justify-between items-center font-bold text-lg mb-4">
            <span>Total</span>
            <span className="text-blue-700">${total.toFixed(2)}</span>
          </div>
          <button type="button" onClick={onCheckout} disabled={ordering} className="btn-primary w-full py-3.5 text-base disabled:opacity-50">
            {ordering ? '⏳ Procesando...' : getToken() ? '✅ Confirmar preventa' : '🔐 Iniciar sesión para pedir'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function CatalogPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [data, setData] = useState<CatalogData | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    publicFetch<CatalogData>(`/public/company/${COMPANY_SLUG_CONST}/catalog/${params.slug}`)
      .then(setData).catch(console.error);
  }, [params.slug]);

  useEffect(() => {
    document.body.style.overflow = showCart ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showCart]);

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
    } catch (err: any) {
      alert(err.message || 'Error al procesar pedido');
    } finally {
      setOrdering(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="card p-10 max-w-md text-center">
          <CheckCircle className="mx-auto text-emerald-600 mb-4" size={48} />
          <h2 className="text-xl font-bold">{success}</h2>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/portal" className="btn-primary">Ir al portal</Link>
            <Link href="/" className="btn-outline">Inicio</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-blue-700 text-sm min-w-0">
            <ArrowLeft size={16} className="shrink-0" />
            <span className="truncate">{data?.company.name || 'GHome'}</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowCart(true)}
            className="relative btn-secondary text-sm py-2.5 px-4 flex items-center gap-2 shrink-0"
          >
            <ShoppingCart size={18} />
            <span className="hidden xs:inline">Carrito</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-700 text-white text-xs min-w-[1.25rem] h-5 px-1 rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <span className="badge-blue">{data?.catalog.isPresale ? '🛒 Preventa' : '📚 Catálogo'}</span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-2 flex items-center gap-2">
            <span aria-hidden>📚</span> {data?.catalog.name || 'Catálogo'}
          </h1>
          {data?.catalog.description && <p className="text-slate-600 mt-2 text-sm sm:text-base">{data.catalog.description}</p>}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {data?.items.map((item) => (
            <div key={item.productId} className="card overflow-hidden">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-40 sm:h-44 object-cover" />
              ) : (
                <div className="w-full h-40 sm:h-44 bg-slate-100 flex items-center justify-center text-3xl text-slate-300">📦</div>
              )}
              <div className="p-4">
                <p className="text-xs text-slate-500">{item.sku}</p>
                <h3 className="font-semibold mt-1 line-clamp-2">{item.name}</h3>
                <p className="text-blue-700 font-bold text-lg mt-2">${item.price.toFixed(2)}</p>
                <button type="button" onClick={() => addToCart(item)} className="btn-primary w-full mt-3 text-sm py-2.5">
                  🛒 Agregar al carrito
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Móvil: carrito pantalla completa */}
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

      {/* Escritorio: panel lateral */}
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
