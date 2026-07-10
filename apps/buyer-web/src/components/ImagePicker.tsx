'use client';

import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { uploadImage } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';

type SingleProps = {
  multiple?: false;
  value?: string;
  onChange: (url: string | undefined) => void;
  values?: never;
  onChangeMany?: never;
  max?: never;
};

type MultiProps = {
  multiple: true;
  values?: string[];
  onChangeMany: (urls: string[]) => void;
  value?: never;
  onChange?: never;
  max?: number;
};

export function ImagePicker({
  label = 'Imagen',
  ...props
}: { label?: string } & (SingleProps | MultiProps)) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const isMulti = props.multiple === true;
  const urls = isMulti ? (props.values || []) : (props.value ? [props.value] : []);
  const max = isMulti ? (props.max ?? 8) : 1;

  const onFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, Math.max(0, max - urls.length));
    if (!list.length) return;
    setUploading(true);
    setError('');
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        const { url } = await uploadImage(file);
        uploaded.push(url);
      }
      if (isMulti) {
        props.onChangeMany([...urls, ...uploaded].slice(0, max));
      } else {
        props.onChange(uploaded[0]);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo subir la imagen'));
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (index: number) => {
    if (isMulti) {
      props.onChangeMany(urls.filter((_, i) => i !== index));
    } else {
      props.onChange(undefined);
    }
  };

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">
        {label}{isMulti ? ` (hasta ${max})` : ''}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={isMulti}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="flex flex-wrap gap-2 items-start">
        {urls.map((url, i) => (
          <div key={`${url}-${i}`} className="relative inline-block">
            <img src={url} alt="" className="h-24 w-24 object-cover rounded-xl border border-white/10" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {urls.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 h-24 px-4 rounded-xl border border-dashed border-white/20 text-sm text-gray-400 hover:border-[#00D1FF] hover:text-[#00D1FF] disabled:opacity-50"
          >
            <ImagePlus className="w-5 h-5" />
            {uploading ? 'Subiendo...' : isMulti ? 'Agregar fotos' : 'Cargar imagen'}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
