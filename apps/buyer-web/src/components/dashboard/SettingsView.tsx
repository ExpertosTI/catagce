'use client';

import { useState, useEffect } from 'react';
import { 
  Palette, User, MessageSquare, MapPin, 
  Instagram, Globe, Mail, DollarSign, 
  Plus, X, Edit2, ArrowRight 
} from 'lucide-react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&auto=format&fit=crop';

export function SettingsView({ profile, onUpdate, onLogout }: any) {
  const [formData, setFormData] = useState<any>({
    name: '',
    logoUrl: '',
    bannerUrl: '',
    primaryColor: '#FACD01',
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
        primaryColor: profile.branding?.primaryColor || '#FACD01',
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

  const primaryColor = formData.primaryColor || "#FACD01";

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
               <h3 className="font-bebas text-3xl uppercase tracking-wide">{formData.name || 'MI COMERCIO'}</h3>
               <p className="font-rajdhani text-xs text-gray-500 line-clamp-2">{formData.description || 'Sin descripción configurada...'}</p>
               <div className="flex gap-2 pt-4">
                 <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400"><Instagram className="w-4 h-4" /></div>
                 <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400"><Globe className="w-4 h-4" /></div>
                 <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400"><MapPin className="w-4 h-4" /></div>
               </div>
            </div>
          </div>

          <button onClick={onLogout} className="w-full py-4 glass border-red-500/20 text-red-500 rounded-2xl font-bebas text-xl tracking-widest uppercase hover:bg-red-500 hover:text-white transition-all">
            CERRAR SESIÓN
          </button>
        </div>

        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-8">
           {activeSubTab === 'profile' && (
             <div className="glass p-10 rounded-[40px] space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest">Nombre del Comercio</label>
                    <input name="name" value={formData.name} onChange={handleChange} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 outline-none focus:border-white/30" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest">WhatsApp Business</label>
                    <input name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 outline-none focus:border-white/30" placeholder="+123..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest">Descripción / Bio</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 outline-none focus:border-white/30 resize-none" />
                </div>
             </div>
           )}

           {activeSubTab === 'branding' && (
             <div className="glass p-10 rounded-[40px] space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest">Color Primario (HEX)</label>
                    <div className="flex gap-4">
                      <input name="primaryColor" value={formData.primaryColor} onChange={handleChange} className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl px-6 outline-none focus:border-white/30 uppercase" />
                      <div className="w-14 h-14 rounded-2xl border border-white/10" style={{ backgroundColor: primaryColor }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest">Instagram Username</label>
                    <input name="instagram" value={formData.instagram} onChange={handleChange} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 outline-none focus:border-white/30" placeholder="@..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest">Logo URL</label>
                  <input name="logoUrl" value={formData.logoUrl} onChange={handleChange} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 outline-none focus:border-white/30" />
                </div>
             </div>
           )}

           {activeSubTab === 'payments' && (
              <div className="glass p-10 rounded-[40px] space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bebas text-2xl uppercase tracking-widest">MÉTODOS DE PAGO</h4>
                  <button type="button" onClick={addPayment} className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">+ AÑADIR</button>
                </div>
                <div className="space-y-4">
                  {paymentList.map((p, i) => (
                    <div key={i} className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                      <div className="flex justify-between">
                        <select 
                          value={p.type} 
                          onChange={(e) => updatePayment(i, 'type', e.target.value)}
                          className="bg-transparent border-none font-bebas text-xl outline-none"
                        >
                          <option value="bank" className="bg-black">TRANSFERENCIA</option>
                          <option value="crypto" className="bg-black">CRYPTO</option>
                          <option value="cash" className="bg-black">EFECTIVO</option>
                        </select>
                        <button type="button" onClick={() => removePayment(i)} className="text-red-500/50 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                      <input placeholder="NOMBRE (EJ: BANCO POPULAR)" value={p.label} onChange={(e) => updatePayment(i, 'label', e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 outline-none" />
                      <input placeholder="DETALLES (CUENTA, TITULAR...)" value={p.details} onChange={(e) => updatePayment(i, 'details', e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 outline-none" />
                    </div>
                  ))}
                </div>
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
  );
}
