'use client';

import { useEffect, useState } from 'react';
import DashboardLayout, { PageHeader, SectionTitle } from '../../../components/DashboardLayout';
import { FormField } from '../../../components/FormField';
import { ImageUploadField } from '../../../components/ImageUploadField';
import { apiFetch } from '../../../lib/api';
import { SITE_URL, ADMIN_URL } from '../../../lib/site';
import { comprobanteTypeLabel } from '../../../lib/labels';
import { LoadingState } from '../../../components/LoadingState';
import { PAGE } from '../../../lib/page-titles';

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
      alert(err instanceof Error ? err.message : 'No se pudo guardar la secuencia');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="executive-card max-w-2xl space-y-4 mt-6">
      <SectionTitle emoji="🧾">Secuencias NCF (DGII)</SectionTitle>
      <p className="text-xs text-slate-500 -mt-2">Configure los rangos autorizados por la DGII para cada tipo de comprobante.</p>

      {loading ? (
        <p className="text-sm text-slate-400">⏳ Cargando secuencias...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 border-b">
              <tr>
                <th className="text-left py-2">Tipo</th>
                <th className="text-right py-2">Rango</th>
                <th className="text-right py-2">Siguiente</th>
                <th className="text-right py-2">Restantes</th>
              </tr>
            </thead>
            <tbody>
              {sequences.map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="py-2">{comprobanteTypeLabel[s.comprobanteType] ?? s.comprobanteType}</td>
                  <td className="py-2 text-right text-slate-500">{s.rangeFrom}–{s.rangeTo}</td>
                  <td className="py-2 text-right font-mono">{s.comprobanteType}{String(s.currentNumber).padStart(8, '0')}</td>
                  <td className="py-2 text-right">{Math.max(0, s.rangeTo - s.currentNumber + 1)}</td>
                </tr>
              ))}
              {!sequences.length && (
                <tr><td colSpan={4} className="py-4 text-center text-slate-400">📋 Sin secuencias configuradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={saveSequence} className="border-t border-slate-100 pt-4 space-y-3">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Agregar / actualizar secuencia</p>
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
          {saving ? '⏳ Guardando...' : '💾 Guardar secuencia NCF'}
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
};

export default function SettingsPage() {
  const [form, setForm] = useState<Company>({ name: '', slug: '' });
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<Company>('/companies/me').then((c) => {
      setForm(c);
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
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <DashboardLayout>
        <LoadingState emoji="⚙️" message="Cargando configuración..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader emoji={PAGE.settings.emoji} title={PAGE.settings.title} subtitle={PAGE.settings.subtitle} />

      <SectionTitle emoji="🏢">Datos de la empresa</SectionTitle>
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
          <FormField label="Teléfono">
            <input type="tel" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
          </FormField>
        </div>
        <FormField label="Dirección">
          <input value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
        </FormField>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? '⏳ Guardando...' : '💾 Guardar cambios'}
          </button>
          {saved && <span className="text-sm text-emerald-600 font-medium">✅ Guardado</span>}
        </div>
      </form>

      <FiscalSequencesPanel />

      <div className="executive-card max-w-lg space-y-3 mt-6">
        <SectionTitle emoji="🔗">Enlaces de la plataforma</SectionTitle>
        <div>
          <p className="text-xs text-slate-500">Identificador del portal (slug)</p>
          <p className="font-mono text-blue-700">{form.slug}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Panel de administración</p>
          <a href={ADMIN_URL} className="text-blue-700 hover:underline text-sm">{ADMIN_URL}</a>
        </div>
        <div>
          <p className="text-xs text-slate-500">Portal de clientes</p>
          <a href={SITE_URL} className="text-blue-700 hover:underline text-sm">{SITE_URL}</a>
        </div>
      </div>
    </DashboardLayout>
  );
}
