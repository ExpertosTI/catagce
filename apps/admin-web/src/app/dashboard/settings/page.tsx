'use client';

import { useEffect, useState } from 'react';
import {
  Building2, Check, ExternalLink, FileText, Link2, Loader2, MessageCircle, Receipt, Sparkles,
} from 'lucide-react';
import DashboardLayout, { PageHeader, SectionTitle } from '../../../components/DashboardLayout';
import { FormField } from '../../../components/FormField';
import { ImageUploadField } from '../../../components/ImageUploadField';
import { ReportTableCard } from '../../../components/ReportTableCard';
import { apiFetch } from '../../../lib/api';
import { SITE_URL, ADMIN_URL } from '../../../lib/site';
import { comprobanteTypeLabel } from '../../../lib/labels';
import { LoadingState } from '../../../components/LoadingState';
import { PAGE } from '../../../lib/page-titles';
import { useAppDialog } from '../../../components/AppDialogProvider';
import { clearCompanyCache } from '../../../lib/useCompany';

type FiscalSequence = {
  id: string;
  comprobanteType: string;
  rangeFrom: number;
  rangeTo: number;
  currentNumber: number;
  authorizedUntil?: string | null;
  isActive: boolean;
};

function FiscalSequencesPanel() {
  const [sequences, setSequences] = useState<FiscalSequence[]>([]);
  const { alert } = useAppDialog();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    comprobanteType: 'B01', rangeFrom: 1, rangeTo: 10000, currentNumber: 1, authorizedUntil: '',
  });
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    apiFetch<FiscalSequence[]>('/fiscal/sequences').then(setSequences).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function saveSequence(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/fiscal/sequences', {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          authorizedUntil: form.authorizedUntil || undefined,
        }),
      });
      load();
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'No se pudo guardar la secuencia', variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4 mt-6">
      <ReportTableCard
        title="Secuencias NCF (DGII)"
        subtitle="Rangos autorizados por tipo de comprobante"
        icon={<Receipt size={16} className="text-blue-600" />}
      >
        {loading ? (
          <LoadingState message="Cargando secuencias..." />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-slate-500 border-b bg-slate-50/50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                <th className="text-right py-3 px-4 font-semibold">Rango</th>
                <th className="text-right py-3 px-4 font-semibold">Siguiente</th>
                <th className="text-right py-3 px-4 font-semibold">Restantes</th>
              </tr>
            </thead>
            <tbody>
              {sequences.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="py-3 px-4">{comprobanteTypeLabel[s.comprobanteType] ?? s.comprobanteType}</td>
                  <td className="py-3 px-4 text-right text-slate-500 tabular-nums">{s.rangeFrom}–{s.rangeTo}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs">{s.comprobanteType}{String(s.currentNumber).padStart(8, '0')}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium">{Math.max(0, s.rangeTo - s.currentNumber + 1)}</td>
                </tr>
              ))}
              {!sequences.length && (
                <tr><td colSpan={4} className="py-8 text-center text-slate-400">Sin secuencias configuradas</td></tr>
              )}
            </tbody>
          </table>
        )}
      </ReportTableCard>

      <form onSubmit={saveSequence} className="form-card space-y-4">
        <SectionTitle icon={<FileText size={16} className="text-blue-600" />}>Agregar o actualizar secuencia</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-3">
          <FormField label="Tipo de comprobante">
            <select value={form.comprobanteType} onChange={(e) => setForm({ ...form, comprobanteType: e.target.value })} className="input text-sm">
              {['B01', 'B02', 'B03', 'B04', 'B14'].map((t) => (
                <option key={t} value={t}>{comprobanteTypeLabel[t]}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Válido hasta">
            <input type="date" value={form.authorizedUntil} onChange={(e) => setForm({ ...form, authorizedUntil: e.target.value })} className="input text-sm" />
          </FormField>
          <FormField label="Desde">
            <input type="number" min={1} value={form.rangeFrom} onChange={(e) => setForm({ ...form, rangeFrom: parseInt(e.target.value, 10) })} className="input text-sm" />
          </FormField>
          <FormField label="Hasta">
            <input type="number" min={1} value={form.rangeTo} onChange={(e) => setForm({ ...form, rangeTo: parseInt(e.target.value, 10) })} className="input text-sm" />
          </FormField>
          <FormField label="Número actual">
            <input type="number" min={1} value={form.currentNumber} onChange={(e) => setForm({ ...form, currentNumber: parseInt(e.target.value, 10) })} className="input text-sm" />
          </FormField>
        </div>
        <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Guardando...' : 'Guardar secuencia NCF'}
        </button>
      </form>
    </div>
  );
}

type Company = {
  name: string;
  slug: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  settings?: { autoReceiptOnPayment?: boolean; geminiApiKey?: string; hasGeminiKey?: boolean };
};

export default function SettingsPage() {
  const { alert } = useAppDialog();
  const [form, setForm] = useState<Company>({ name: '', slug: '' });
  const [autoReceipt, setAutoReceipt] = useState(true);
  const [geminiKey, setGeminiKey] = useState('');
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<Company>('/companies/me').then((c) => {
      setForm(c);
      setAutoReceipt(c.settings?.autoReceiptOnPayment !== false);
      setGeminiKey(c.settings?.geminiApiKey ?? '');
      setHasGeminiKey(Boolean(c.settings?.hasGeminiKey));
      setReady(true);
    }).catch(console.error);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      await apiFetch('/companies/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name,
          taxId: form.taxId,
          email: form.email,
          phone: form.phone,
          address: form.address,
          logoUrl: form.logoUrl,
          settings: {
            autoReceiptOnPayment: autoReceipt,
            ...(!geminiKey.includes('•') ? { geminiApiKey: geminiKey.trim() } : {}),
          },
        }),
      });
      clearCompanyCache();
      const refreshed = await apiFetch<Company>('/companies/me');
      setForm(refreshed);
      setGeminiKey(refreshed.settings?.geminiApiKey ?? '');
      setHasGeminiKey(Boolean(refreshed.settings?.hasGeminiKey));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'No se pudo guardar', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <DashboardLayout>
        <LoadingState message="Cargando configuración..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>

      <SectionTitle icon={<Building2 size={16} className="text-blue-600" />}>Datos de la empresa</SectionTitle>
      <form onSubmit={submit} className="form-card max-w-lg space-y-4 mb-6">
        <ImageUploadField
          value={form.logoUrl ?? ''}
          onChange={(url) => setForm({ ...form, logoUrl: url })}
          label="Logo de la empresa"
          aspect="square"
        />

        <FormField label="Nombre de la empresa">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required />
        </FormField>
        <FormField label="RNC / Identificación fiscal">
          <input value={form.taxId ?? ''} onChange={(e) => setForm({ ...form, taxId: e.target.value })} className="input" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Correo de contacto">
            <input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          </FormField>
          <FormField label="WhatsApp del negocio">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input"
              placeholder="8095550000"
            />
            <p className="form-hint">
              Alertas de pedidos nuevos y reportes del Super AI. Cámbielo aquí y se actualiza al instante.
            </p>
          </FormField>
        </div>
        <FormField label="Dirección">
          <input value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
        </FormField>

        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-emerald-600" />
            <p className="text-sm font-semibold text-slate-800">Notificaciones WhatsApp</p>
          </div>
          <p className="text-xs text-slate-500">
            Los pedidos del catálogo y la app móvil avisan al <strong>WhatsApp del negocio</strong> de arriba.
            Los clientes reciben confirmación si tienen teléfono en su perfil.
          </p>
          {!form.phone?.trim() && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Configure el WhatsApp del negocio para recibir alertas de pedidos.
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-violet-600" />
            <p className="text-sm font-semibold text-slate-800">Super AI (Google Gemini)</p>
          </div>
          <p className="text-xs text-slate-500">
            Conecte su API de Google para análisis inteligente, descripciones de productos y recordatorios más naturales.
          </p>
          <FormField label="API Key de Google Gemini">
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="input font-mono text-sm"
              placeholder={hasGeminiKey ? 'Dejar en blanco para mantener la clave actual' : 'AIza...'}
              autoComplete="off"
            />
            <p className="form-hint">
              Obtenga su clave en{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline inline-flex items-center gap-1">
                Google AI Studio <ExternalLink size={12} />
              </a>
              . {hasGeminiKey && (
                <span className="text-emerald-600 font-medium inline-flex items-center gap-1 ml-1">
                  <Check size={14} /> Clave configurada
                </span>
              )}
            </p>
          </FormField>
        </div>

        <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={autoReceipt}
            onChange={(e) => setAutoReceipt(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600"
          />
          <div>
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Receipt size={16} className="text-slate-500" /> Generar recibo al registrar pago
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Imprime automáticamente el recibo cuando se confirma un pago en facturas.</p>
          </div>
        </label>

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && (
            <span className="text-sm text-emerald-600 font-medium inline-flex items-center gap-1">
              <Check size={16} /> Guardado
            </span>
          )}
        </div>
      </form>

      <FiscalSequencesPanel />

      <div className="executive-card max-w-lg space-y-4 mt-6">
        <SectionTitle icon={<Link2 size={16} className="text-blue-600" />}>Enlaces de la plataforma</SectionTitle>
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Identificador del portal</p>
            <p className="font-mono text-blue-700 mt-1">{form.slug}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Panel de administración</p>
            <a href={ADMIN_URL} className="text-blue-700 hover:underline text-sm inline-flex items-center gap-1 mt-1">
              {ADMIN_URL} <ExternalLink size={12} />
            </a>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Portal de clientes</p>
            <a href={SITE_URL} className="text-blue-700 hover:underline text-sm inline-flex items-center gap-1 mt-1">
              {SITE_URL} <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
