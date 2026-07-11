'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Webhook, Plug, Palette, RefreshCw, Plus, Sparkles, MessageCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ImageUpload } from '@/components/ImageUpload';
import { WhatsAppConnectPanel } from '@/components/WhatsAppConnectPanel';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useMe } from '@/lib/features';

const WEBHOOK_EVENTS = ['order.created', 'order.updated', 'catalog.published', 'product.created', 'integration.synced'];

export default function SettingsPage() {
  const router = useRouter();
  const { ensureAuth, onApiError } = useRequireAuth();
  const { me } = useMe();
  const [tab, setTab] = useState<'whatsapp' | 'branding' | 'webhooks' | 'integrations' | 'ai'>('whatsapp');
  const [branding, setBranding] = useState<any>({});
  const [sellerSettings, setSellerSettings] = useState({ whatsappNumber: '', orderNotifyPhone: '' });
  const [aiConfig, setAiConfig] = useState({ googleAiApiKey: '', aiModel: 'gemini-2.5-flash', aiEnabled: true, hasApiKey: false, apiKeyPreview: null as string | null });
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [newWebhook, setNewWebhook] = useState({ url: '', events: ['order.created'] });
  const [odooConfig, setOdooConfig] = useState({ url: '', database: '', username: '', apiKey: '' });
  const [syncing, setSyncing] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');
  const [error, setError] = useState('');

  const flash = (msg: string) => {
    setSaveMsg(msg);
    setSaveErr('');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  useEffect(() => {
    if (!ensureAuth()) return;
    Promise.all([
      apiFetch('/sellers/branding'),
      apiFetch<any>('/sellers/settings'),
      apiFetch<any[]>('/webhooks'),
      apiFetch<any[]>('/integrations'),
      apiFetch<any>('/ai/config'),
    ]).then(([b, s, w, i, ai]) => {
      setBranding(b || {});
      setSellerSettings(s || { whatsappNumber: '', orderNotifyPhone: '' });
      setWebhooks(w);
      setIntegrations(i);
      setAiConfig((prev) => ({ ...prev, ...ai, googleAiApiKey: '' }));
      const odoo = i.find((x: any) => x.type === 'odoo');
      if (odoo?.config) setOdooConfig(odoo.config);
    }).catch((err) => {
      if (!onApiError(err)) setError(getErrorMessage(err));
    });
  }, [router, ensureAuth, onApiError]);

  const saveBranding = async () => {
    setSaveErr('');
    try {
      const [updated, settings] = await Promise.all([
        apiFetch<any>('/sellers/branding', {
          method: 'PATCH',
          body: JSON.stringify({
            primaryColor: branding.primaryColor,
            accentColor: branding.accentColor,
            welcomeMessage: branding.welcomeMessage,
            logoUrl: branding.logoUrl || undefined,
          }),
        }),
        apiFetch('/sellers/settings', {
          method: 'PATCH',
          body: JSON.stringify({
            whatsappNumber: sellerSettings.whatsappNumber,
            orderNotifyPhone: sellerSettings.orderNotifyPhone,
          }),
        }),
      ]);
      setBranding(updated);
      setSellerSettings(settings as { whatsappNumber: string; orderNotifyPhone: string });
      flash('Configuración guardada');
    } catch (err) {
      setSaveErr(getErrorMessage(err, 'No se pudo guardar'));
    }
  };

  const addWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveErr('');
    try {
      const hook = await apiFetch('/webhooks', { method: 'POST', body: JSON.stringify(newWebhook) });
      setWebhooks([...webhooks, hook]);
      setNewWebhook({ url: '', events: ['order.created'] });
      flash('Webhook agregado');
    } catch (err) {
      setSaveErr(getErrorMessage(err, 'No se pudo crear el webhook'));
    }
  };

  const saveOdoo = async () => {
    setSaveErr('');
    try {
      const existing = integrations.find((i) => i.type === 'odoo');
      if (existing) {
        await apiFetch(`/integrations/${existing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ config: odooConfig, name: 'Odoo ERP' }),
        });
      } else {
        const created = await apiFetch('/integrations', {
          method: 'POST',
          body: JSON.stringify({ type: 'odoo', name: 'Odoo ERP', config: odooConfig }),
        });
        setIntegrations([...integrations, created]);
      }
      flash('Integración Odoo guardada');
    } catch (err) {
      setSaveErr(getErrorMessage(err, 'No se pudo guardar Odoo'));
    }
  };

  const syncOdoo = async (id: string) => {
    setSyncing(id);
    try {
      const result = await apiFetch<{ synced: number }>(`/integrations/${id}/sync`, { method: 'POST' });
      alert(`Sincronizados ${result.synced} productos desde Odoo`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSyncing(null);
    }
  };

  const saveAiConfig = async () => {
    setSaveErr('');
    try {
      const payload: Record<string, unknown> = {
        aiModel: aiConfig.aiModel,
        aiEnabled: aiConfig.aiEnabled,
      };
      if (aiConfig.googleAiApiKey) payload.googleAiApiKey = aiConfig.googleAiApiKey;
      const updated = await apiFetch<any>('/ai/config', { method: 'PATCH', body: JSON.stringify(payload) });
      setAiConfig((prev) => ({ ...prev, ...updated, googleAiApiKey: '' }));
      flash('Superpower AI guardado');
    } catch (err) {
      setSaveErr(getErrorMessage(err, 'No se pudo guardar la configuración AI'));
    }
  };

  const tabs = [
    { id: 'whatsapp' as const, label: 'WhatsApp', icon: MessageCircle },
    { id: 'branding' as const, label: 'Marca', icon: Palette },
    { id: 'ai' as const, label: 'Superpower AI', icon: Sparkles },
    { id: 'webhooks' as const, label: 'Webhooks', icon: Webhook },
    { id: 'integrations' as const, label: 'Integraciones', icon: Plug },
  ];

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-2">Configuración</h2>
      {me?.planName && (
        <p className="mb-6 text-sm text-gray-400">
          Plan actual: <span className="text-[#00D1FF] font-semibold">{me.planName}</span>
          <span className="text-gray-600 font-mono ml-1">({me.planCode})</span>
        </p>
      )}
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {saveMsg && <p className="mb-4 text-sm text-green-400">{saveMsg}</p>}
      {saveErr && <p className="mb-4 text-sm text-red-400">{saveErr}</p>}

      <div className="flex gap-2 mb-8 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              tab === id ? 'bg-[#00D1FF] text-black' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'whatsapp' && <WhatsAppConnectPanel />}

      {tab === 'branding' && (
        <div className="glass rounded-2xl p-6 space-y-4 max-w-lg">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">WhatsApp del negocio *</label>
            <input
              value={sellerSettings.whatsappNumber}
              onChange={(e) => setSellerSettings({ ...sellerSettings, whatsappNumber: e.target.value })}
              placeholder="809 / 829 / 849…"
              className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00D1FF]"
            />
            <p className="text-xs text-gray-500 mt-1">Los clientes escriben / confirman pedidos a este número</p>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">WhatsApp admin (avisos de pedidos) *</label>
            <input
              value={sellerSettings.orderNotifyPhone}
              onChange={(e) => setSellerSettings({ ...sellerSettings, orderNotifyPhone: e.target.value })}
              placeholder="809, 829 o 849…"
              className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00D1FF]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recibes un WhatsApp automático cuando alguien hace un pedido. Debe ser distinto al del cliente.
            </p>
          </div>

          <ImageUpload
            value={branding.logoUrl || ''}
            onChange={(url) => setBranding({ ...branding, logoUrl: url })}
            label="Logo de tu tienda"
          />

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Color primario</label>
            <input
              type="color"
              value={branding.primaryColor || '#00D1FF'}
              onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
              className="w-full h-12 rounded-xl cursor-pointer"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Color de acento</label>
            <input
              type="color"
              value={branding.accentColor || '#FF8A00'}
              onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
              className="w-full h-12 rounded-xl cursor-pointer"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Mensaje de bienvenida</label>
            <textarea
              value={branding.welcomeMessage || ''}
              onChange={(e) => setBranding({ ...branding, welcomeMessage: e.target.value })}
              className="w-full h-24 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00D1FF] resize-none"
              placeholder="Bienvenido a nuestro catálogo..."
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">URL del logo (opcional si subiste arriba)</label>
            <input
              value={branding.logoUrl || ''}
              onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
              className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00D1FF]"
              placeholder="https://..."
            />
          </div>
          <button onClick={saveBranding} className="px-6 py-3 bg-[#00D1FF] text-black font-bold rounded-xl">
            Guardar configuración
          </button>
        </div>
      )}

      {tab === 'webhooks' && (
        <div className="space-y-6">
          <form onSubmit={addWebhook} className="glass rounded-2xl p-6 space-y-4 max-w-lg">
            <h3 className="font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo Webhook</h3>
            <input
              placeholder="https://tu-servidor.com/webhook"
              value={newWebhook.url}
              onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
              className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none"
              required
            />
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_EVENTS.map((ev) => (
                <button
                  key={ev}
                  type="button"
                  onClick={() => {
                    const events = newWebhook.events.includes(ev)
                      ? newWebhook.events.filter((e) => e !== ev)
                      : [...newWebhook.events, ev];
                    setNewWebhook({ ...newWebhook, events });
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-mono ${
                    newWebhook.events.includes(ev) ? 'bg-[#00D1FF] text-black' : 'bg-white/5 text-gray-400'
                  }`}
                >
                  {ev}
                </button>
              ))}
            </div>
            <button type="submit" className="px-6 py-2 bg-[#FF8A00] text-black font-bold rounded-xl text-sm">
              Agregar Webhook
            </button>
          </form>

          {webhooks.map((hook) => (
            <div key={hook.id} className="glass rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-sm truncate max-w-md">{hook.url}</p>
                <p className="text-xs text-gray-500 mt-1">{hook.events?.join(', ')}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${hook.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                {hook.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'ai' && (
        <div className="glass rounded-2xl p-6 space-y-4 max-w-lg">
          <h3 className="font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#00D1FF]" /> Superpower AI (Google Gemini)
          </h3>
          <p className="text-sm text-gray-400">
            Conecta tu API Key de Google AI para activar el asistente inteligente que puede gestionar toda tu tienda.
            Obtén una gratis en{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-[#00D1FF] hover:underline">
              aistudio.google.com/apikey
            </a>
          </p>

          {aiConfig.apiKeyPreview && (
            <p className="text-xs text-green-400 font-mono">✓ Key configurada: {aiConfig.apiKeyPreview}</p>
          )}

          <input
            type="password"
            placeholder="Google AI API Key (AIza... o AQ....)"
            value={aiConfig.googleAiApiKey}
            onChange={(e) => setAiConfig({ ...aiConfig, googleAiApiKey: e.target.value })}
            className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00D1FF] font-mono text-sm"
          />

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Modelo</label>
            <select
              value={aiConfig.aiModel}
              onChange={(e) => setAiConfig({ ...aiConfig, aiModel: e.target.value })}
              className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (recomendado)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={aiConfig.aiEnabled}
              onChange={(e) => setAiConfig({ ...aiConfig, aiEnabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">Asistente AI activo</span>
          </label>

          <div className="p-4 bg-white/5 rounded-xl text-xs text-gray-400 space-y-1">
            <p className="font-bold text-white text-sm mb-2">El asistente puede:</p>
            <p>• Crear y gestionar productos e inventario</p>
            <p>• Publicar catálogos y compartir enlaces</p>
            <p>• Confirmar/rechazar pedidos</p>
            <p>• Sincronizar Odoo, Shopify, WooCommerce</p>
            <p>• Configurar webhooks y branding</p>
            <p>• Mostrar analíticas del negocio</p>
          </div>

          <button onClick={saveAiConfig} className="px-6 py-3 bg-gradient-to-r from-[#00D1FF] to-[#0099cc] text-black font-bold rounded-xl">
            Guardar Superpower AI
          </button>
        </div>
      )}

      {tab === 'integrations' && (
        <div className="glass rounded-2xl p-6 space-y-4 max-w-lg">
          <h3 className="font-bold flex items-center gap-2">
            <Plug className="w-5 h-5 text-[#00D1FF]" /> Odoo ERP
          </h3>
          <p className="text-sm text-gray-400">Importa productos y stock desde tu instancia Odoo vía JSON-RPC.</p>
          <input
            placeholder="URL (https://mi-odoo.com)"
            value={odooConfig.url}
            onChange={(e) => setOdooConfig({ ...odooConfig, url: e.target.value })}
            className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none"
          />
          <input
            placeholder="Base de datos"
            value={odooConfig.database}
            onChange={(e) => setOdooConfig({ ...odooConfig, database: e.target.value })}
            className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none"
          />
          <input
            placeholder="Usuario"
            value={odooConfig.username}
            onChange={(e) => setOdooConfig({ ...odooConfig, username: e.target.value })}
            className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none"
          />
          <input
            type="password"
            placeholder="API Key / Password"
            value={odooConfig.apiKey}
            onChange={(e) => setOdooConfig({ ...odooConfig, apiKey: e.target.value })}
            className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none"
          />
          <div className="flex gap-3">
            <button onClick={saveOdoo} className="px-6 py-3 bg-[#00D1FF] text-black font-bold rounded-xl">
              Guardar
            </button>
            {integrations.find((i) => i.type === 'odoo') && (
              <button
                onClick={() => syncOdoo(integrations.find((i) => i.type === 'odoo').id)}
                disabled={!!syncing}
                className="flex items-center gap-2 px-6 py-3 bg-[#FF8A00] text-black font-bold rounded-xl disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                Sincronizar
              </button>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
