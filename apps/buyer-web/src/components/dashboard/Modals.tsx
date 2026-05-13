'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Camera, X } from 'lucide-react';

const API_BASE = 'https://api.catagce.renace.tech';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('catagce_token');
}

export function CreateProductModal({ onClose, onSubmit, color }: any) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [b2bPrice, setB2bPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const submit = async () => {
    if (!name.trim() || !basePrice) return;
    setSubmitting(true);

    let finalImageUrl = imageUrl;
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const token = getToken();
        const res = await fetch(`${API_BASE}/api/products/upload`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });
        const data = await res.json();
        finalImageUrl = data.url;
      } catch (err) {
        console.error('Upload failed', err);
      }
    }

    await onSubmit({
      name: name.trim(),
      sku: sku.trim() || null,
      basePrice,
      b2bPrice: b2bPrice || null,
      imageUrl: finalImageUrl || null,
      description: description.trim() || null,
    });
    setSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-white/60 backdrop-blur-xl" onClick={onClose} />
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-white p-10 rounded-[40px] w-full max-w-2xl space-y-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
        <div>
          <h3 className="text-3xl font-black tracking-tight">Nuevo Producto</h3>
          <p className="text-sm font-medium text-gray-400 mt-1">Completa los datos para tu inventario</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Imagen del Producto</label>
              <div className="aspect-square bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer">
                {file ? (
                  <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-[10px] font-bold text-gray-400">SUBIR FOTO</p>
                  </>
                )}
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Nombre *</label>
              <input className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-[#FACD01]/50 transition-all" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Camiseta" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">SKU</label>
                <input className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 text-sm font-bold outline-none" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="001" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Precio *</label>
                <input type="number" className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 text-sm font-bold outline-none" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Descripción</label>
              <textarea className="w-full h-24 bg-gray-50 border-none rounded-xl p-4 text-sm font-bold outline-none resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="..." />
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button onClick={onClose} disabled={submitting} className="flex-1 py-4 text-gray-400 font-bold text-sm">Cancelar</button>
          <button 
            onClick={submit} 
            disabled={submitting || !name.trim() || !basePrice} 
            className="flex-1 py-4 bg-[#FACD01] text-black rounded-xl font-bold text-sm shadow-lg shadow-yellow-100 disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Crear Producto'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CreateCatalogModal({ onClose, onSubmit, color }: any) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative glass p-10 rounded-[40px] w-full max-w-lg space-y-8">
        <h3 className="text-4xl font-bebas tracking-widest uppercase">GENERAR <span style={{ color }}>CATÁLOGO</span></h3>
        <div className="space-y-4">
          <div>
            <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">NOMBRE DEL CATÁLOGO</label>
            <input className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 font-rajdhani text-sm tracking-widest text-white focus:border-[#00D1FF] outline-none transition-all" value={name} onChange={(e) => setName(e.target.value)} placeholder="EJ: TEMPORADA 2026" />
          </div>
          <div>
            <label className="font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">SLUG DE ACCESO (URL)</label>
            <input className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 font-rajdhani text-sm tracking-widest text-white focus:border-[#00D1FF] outline-none transition-all" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/ /g, '-'))} placeholder="ej: temporada-2026" />
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 py-5 glass border-white/10 rounded-2xl font-bebas text-xl tracking-widest uppercase">CANCELAR</button>
          <button 
            onClick={() => onSubmit(name, slug)} 
            className="flex-1 py-5 text-black rounded-2xl font-bebas text-xl tracking-widest uppercase shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
            style={{ backgroundColor: color }}
          >
            CREAR
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CreateTenantModal({ onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', slug: '' });
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-white/60 backdrop-blur-xl" onClick={onClose} />
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-white p-10 rounded-[40px] w-full max-w-lg space-y-8 shadow-2xl border border-gray-100">
        <div>
          <h3 className="text-3xl font-black tracking-tight">Nuevo Tenant</h3>
          <p className="text-sm font-medium text-gray-400 mt-1">Crea una nueva cuenta de comercio</p>
        </div>
        <div className="space-y-4">
          <input className="w-full h-14 bg-gray-50 border-none rounded-2xl px-6 text-sm font-bold outline-none" placeholder="Nombre del Comercio" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <input className="w-full h-14 bg-gray-50 border-none rounded-2xl px-6 text-sm font-bold outline-none" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          <input className="w-full h-14 bg-gray-50 border-none rounded-2xl px-6 text-sm font-bold outline-none" placeholder="Contraseña" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          <input className="w-full h-14 bg-gray-50 border-none rounded-2xl px-6 text-sm font-bold outline-none" placeholder="slug-url" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase()})} />
        </div>
        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 py-4 text-gray-400 font-bold text-sm">Cancelar</button>
          <button onClick={() => onSubmit(formData)} className="flex-1 py-4 bg-[#FACD01] text-black rounded-xl font-bold text-sm shadow-lg">Crear Comercio</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
