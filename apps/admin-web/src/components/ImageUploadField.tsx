'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { API_URL, getToken } from '../lib/api';

type Props = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  aspect?: 'square' | 'wide';
};

export function ImageUploadField({ value, onChange, label = 'Imagen', aspect = 'wide' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file: File) {
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_URL}/uploads/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Error al subir imagen' }));
        throw new Error(err.message);
      }
      const data = await response.json();
      const url = data.url.startsWith('http') ? data.url : `${API_URL.replace(/\/api$/, '')}${data.url}`;
      onChange(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const aspectClass = aspect === 'square' ? 'aspect-square' : 'aspect-[16/9]';

  return (
    <div>
      <label className="form-label">{label}</label>
      <div
        className={`upload-dropzone ${aspectClass} ${value ? 'p-0' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        {value ? (
          <div className="relative w-full h-full group">
            <img src={value} alt="Vista previa" className="w-full h-full object-cover rounded-xl" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Quitar imagen"
            >
              <X size={14} />
            </button>
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors rounded-xl flex items-center justify-center opacity-0 hover:opacity-100">
              <span className="text-white text-xs font-semibold">Cambiar imagen</span>
            </div>
          </div>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Loader2 size={28} className="animate-spin" />
            <span className="text-xs">Subiendo...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <ImagePlus size={28} />
            <span className="text-xs text-center px-2">Arrastra una foto o haz clic para subirla</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
