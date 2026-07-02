'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Minus, Plus, ArrowLeft, CheckCircle } from 'lucide-react';
import { publicFetch, apiFetch, getToken } from '../../../lib/api';
import { COMPANY_SLUG } from '../../../lib/site';

type CatalogData = {
  company: { name: string };
  catalog: { id: string; name: string; description?: string; isPresale?: boolean };
  items: { productId: string; sku: string; name: string; description?: string; price: number; imageUrl?: string }[];
};

type CartItem = { productId: string; name: string; price: number; quantity: number };

const COMPANY_SLUG_CONST = COMPANY_SLUG;

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
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-blue-700 text-sm">
            <ArrowLeft size={16} /> {data?.company.name || 'GHome'}
          </Link>
          <button onClick={() => setShowCart(!showCart)} className="relative btn-secondary text-sm py-2 flex items-center gap-2">
            <ShoppingCart size={18} />
            Carrito
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-700 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {cart.reduce((s, c) => s + c.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <span className="badge-blue">{data?.catalog.isPresale ? '🛒 Preventa' : '📚 Catálogo'}</span>
          <h1 className="text-3xl font-bold mt-2 flex items-center gap-2">
            <span aria-hidden>📚</span> {data?.catalog.name || 'Catálogo'}
          </h1>
          <p className="text-slate-600 mt-2">{data?.catalog.description}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-5">
            {data?.items.map((item) => (
              <div key={item.productId} className="card overflow-hidden">
                {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-44 object-cover" />}
                <div className="p-4">
                  <p className="text-xs text-slate-500">{item.sku}</p>
                  <h3 className="font-semibold mt-1">{item.name}</h3>
                  <p className="text-blue-700 font-bold text-lg mt-2">${item.price.toFixed(2)}</p>
                  <button onClick={() => addToCart(item)} className="btn-primary w-full mt-3 text-sm py-2">
                    Agregar al carrito
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showCart && (
            <div className="card p-6 h-fit sticky top-24">
              <h2 className="font-bold text-lg">🛒 Su pedido</h2>
              {!cart.length ? (
                <p className="text-slate-500 text-sm mt-4">Carrito vacío</p>
              ) : (
                <>
                  <ul className="mt-4 space-y-3">
                    {cart.map((c) => (
                      <li key={c.productId} className="flex items-center justify-between text-sm border-b border-slate-100 pb-3">
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-slate-500">${c.price.toFixed(2)} c/u</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(c.productId, -1)} className="p-1 rounded border"><Minus size={14} /></button>
                          <span className="w-6 text-center">{c.quantity}</span>
                          <button onClick={() => updateQty(c.productId, 1)} className="p-1 rounded border"><Plus size={14} /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-blue-700">${total.toFixed(2)}</span>
                  </div>
                  <button onClick={checkout} disabled={ordering} className="btn-primary w-full mt-4 disabled:opacity-50">
                    {ordering ? 'Procesando...' : getToken() ? 'Confirmar preventa' : 'Iniciar sesión para pedir'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
