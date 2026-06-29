'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Palette, Package, BookOpen, Zap, CheckCircle2, ArrowRight, ArrowLeft, SkipForward,
} from 'lucide-react';
import { apiFetch, getApiKey, getToken } from '@/lib/api';

const STEPS = [
  { id: 0, title: 'Bienvenido', icon: Sparkles },
  { id: 1, title: 'Tu Marca', icon: Palette },
  { id: 2, title: 'Producto', icon: Package },
  { id: 3, title: 'Catálogo', icon: BookOpen },
  { id: 4, title: 'Superpower AI', icon: Zap },
  { id: 5, title: '¡Listo!', icon: CheckCircle2 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState({ primaryColor: '#00D1FF', accentColor: '#FF8A00', welcomeMessage: '' });
  const [product, setProduct] = useState({ name: '', basePrice: '', imageUrl: '' });
  const [catalog, setCatalog] = useState({ name: '', slug: '' });
  const [aiKey, setAiKey] = useState('');
  const [shareToken, setShareToken] = useState('');

  useEffect(() => {
    if (!getApiKey() && !getToken()) { router.push('/login'); return; }
    apiFetch<{ completed: boolean; step: number }>('/sellers/onboarding')
      .then((o) => { if (o.completed) router.push('/dashboard'); else setStep(o.step); })
      .catch(() => {});
  }, [router]);

  const saveStep = async (nextStep: number, completed = false) => {
    await apiFetch('/sellers/onboarding', {
      method: 'PATCH',
      body: JSON.stringify({ step: nextStep, completed }),
    });
  };

  const next = async () => {
    setLoading(true);
    try {
      if (step === 1) {
        await apiFetch('/sellers/branding', { method: 'PATCH', body: JSON.stringify(branding) });
      }
      if (step === 2 && product.name && product.basePrice) {
        const uoms = await apiFetch<any[]>('/inventory/uoms');
        const warehouses = await apiFetch<any[]>('/inventory/warehouses');
        await apiFetch('/products', {
          method: 'POST',
          body: JSON.stringify({
            name: product.name,
            basePrice: parseFloat(product.basePrice),
            imageUrl: product.imageUrl || undefined,
            baseUomId: uoms[0]?.id,
            warehouseId: warehouses[0]?.id,
            initialStock: 100,
          }),
        });
      }
      if (step === 3 && catalog.name && catalog.slug) {
        const products = await apiFetch<any[]>('/products');
        const created = await apiFetch<any>('/catalogs', {
          method: 'POST',
          body: JSON.stringify({
            name: catalog.name,
            slug: catalog.slug,
            productIds: products.map((p) => p.id),
          }),
        });
        setShareToken(created.shareToken || created.publications?.[0]?.token || '');
      }
      if (step === 4 && aiKey) {
        await apiFetch('/ai/config', { method: 'PATCH', body: JSON.stringify({ googleAiApiKey: aiKey }) });
      }
      if (step === 5) {
        await saveStep(5, true);
        router.push('/dashboard');
        return;
      }
      const nextStep = step + 1;
      await saveStep(nextStep);
      setStep(nextStep);
    } catch (err: any) {
      alert(err.message || 'Error en este paso');
    } finally {
      setLoading(false);
    }
  };

  const skip = async () => {
    if (step === 5) return;
    const nextStep = step + 1;
    await saveStep(nextStep);
    setStep(nextStep);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <div className="p-6 border-b border-white/5">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                i <= step ? 'bg-[#00D1FF] text-black' : 'bg-white/10 text-gray-500'
              }`}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${i < step ? 'bg-[#00D1FF]' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="max-w-lg w-full"
          >
            {step === 0 && (
              <div className="text-center">
                <div className="w-20 h-20 bg-[#00D1FF]/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-[#00D1FF]" />
                </div>
                <h1 className="text-3xl font-bold mb-4">¡Bienvenido a Catagce!</h1>
                <p className="text-gray-400 mb-8 leading-relaxed">
                  En 5 minutos tendrás tu catálogo B2B listo para compartir con clientes.
                  Te guiamos paso a paso.
                </p>
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Palette className="w-6 h-6 text-[#00D1FF]" /> Personaliza tu marca</h2>
                <p className="text-gray-400 text-sm mb-6">Colores y mensaje que verán tus clientes.</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Color primario</label>
                      <input type="color" value={branding.primaryColor} onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })} className="w-full h-12 rounded-xl cursor-pointer" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Color acento</label>
                      <input type="color" value={branding.accentColor} onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })} className="w-full h-12 rounded-xl cursor-pointer" />
                    </div>
                  </div>
                  <textarea
                    placeholder="Mensaje de bienvenida para tus clientes..."
                    value={branding.welcomeMessage}
                    onChange={(e) => setBranding({ ...branding, welcomeMessage: e.target.value })}
                    className="w-full h-24 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Package className="w-6 h-6 text-[#FF8A00]" /> Tu primer producto</h2>
                <p className="text-gray-400 text-sm mb-6">Agrega al menos un producto para tu catálogo.</p>
                <div className="space-y-4">
                  <input placeholder="Nombre del producto" value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none" />
                  <input type="number" placeholder="Precio (USD)" value={product.basePrice} onChange={(e) => setProduct({ ...product, basePrice: e.target.value })} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none" />
                  <input placeholder="URL de imagen (opcional)" value={product.imageUrl} onChange={(e) => setProduct({ ...product, imageUrl: e.target.value })} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><BookOpen className="w-6 h-6 text-[#00D1FF]" /> Crea tu catálogo</h2>
                <p className="text-gray-400 text-sm mb-6">Genera un enlace para compartir con clientes.</p>
                <div className="space-y-4">
                  <input placeholder="Nombre del catálogo" value={catalog.name} onChange={(e) => setCatalog({ ...catalog, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none" />
                  <input placeholder="slug-url" value={catalog.slug} onChange={(e) => setCatalog({ ...catalog, slug: e.target.value })} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none font-mono text-sm" />
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Zap className="w-6 h-6 text-[#00D1FF]" /> Activa Superpower AI</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Conecta Google Gemini para un asistente que gestiona toda tu tienda.
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-[#00D1FF] ml-1 hover:underline">Obtener API Key</a>
                </p>
                <input type="password" placeholder="Google AI API Key (AIza...)" value={aiKey} onChange={(e) => setAiKey(e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none font-mono text-sm" />
              </div>
            )}

            {step === 5 && (
              <div className="text-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <h1 className="text-3xl font-bold mb-4">¡Todo listo!</h1>
                <p className="text-gray-400 mb-6">Tu tienda B2B está configurada y lista para vender.</p>
                {shareToken && (
                  <div className="glass rounded-xl p-4 mb-6 text-left">
                    <p className="text-xs text-gray-500 mb-1">Enlace para compartir:</p>
                    <p className="font-mono text-sm text-[#00D1FF] break-all">/order/{shareToken}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-8">
              {step > 0 && step < 5 && (
                <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 px-4 py-3 text-gray-400 hover:text-white">
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </button>
              )}
              <div className="flex-1" />
              {step > 0 && step < 5 && (
                <button onClick={skip} className="flex items-center gap-2 px-4 py-3 text-gray-500 hover:text-gray-300 text-sm">
                  <SkipForward className="w-4 h-4" /> Omitir
                </button>
              )}
              <button
                onClick={next}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-[#00D1FF] text-black font-bold rounded-xl disabled:opacity-50"
              >
                {loading ? 'Guardando...' : step === 5 ? 'Ir al Dashboard' : step === 0 ? 'Empezar' : 'Continuar'}
                {step < 5 && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
