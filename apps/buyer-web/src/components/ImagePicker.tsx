'use client';

import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { uploadImage } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';

export function ImagePicker({
  value,
  onChange,
  label = 'Imagen',
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onFile = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const { url } = await uploadImage(file);
      onChange(url);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo subir la imagen'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
          e.target.value = '';
        }}
      />
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="" className="h-24 w-24 object-cover rounded-xl border border-white/10" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/20 text-sm text-gray-400 hover:border-[#00D1FF] hover:text-[#00D1FF] disabled:opacity-50"
        >
          <ImagePlus className="w-5 h-5" />
          {uploading ? 'Subiendo...' : 'Cargar imagen'}
        </button>
      )}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
