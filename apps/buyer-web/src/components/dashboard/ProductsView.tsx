'use client';

import { Plus } from 'lucide-react';
import { ProductCard, SkeletonCard } from './Cards';

export function ProductsView({ products, loading, color, onCreate, onDelete }: any) {
  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <h2 className="text-6xl font-bebas tracking-wide uppercase">GESTIÓN DE <span style={{ color }}>SKU</span></h2>
        <div className="flex items-center gap-6">
          <span className="font-bebas text-2xl text-gray-700">{products.length} ITEMS</span>
          <button
            onClick={onCreate}
            className="w-14 h-14 rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-[0_0_20px_rgba(0,209,255,0.4)]"
            style={{ backgroundColor: color }}
          >
            <Plus className="w-8 h-8 text-black" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : products.map((p: any) => <ProductCard key={p.id} product={p} color={color} onDelete={() => onDelete(p.id)} />)
        }
      </div>
    </div>
  );
}
