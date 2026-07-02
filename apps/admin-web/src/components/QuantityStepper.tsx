'use client';

import { Minus, Plus } from 'lucide-react';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
};

export function QuantityStepper({ value, onChange, min = 0, max, size = 'md' }: Props) {
  const clamp = (v: number) => {
    let next = v;
    if (max !== undefined) next = Math.min(max, next);
    return Math.max(min, next);
  };

  const btnSize = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const inputSize = size === 'sm' ? 'w-10 text-sm' : 'w-14 text-base';

  return (
    <div className="qty-stepper">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        className={`qty-stepper-btn ${btnSize}`}
        aria-label="Disminuir cantidad"
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
        className={`qty-stepper-input ${inputSize}`}
        aria-label="Cantidad"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        className={`qty-stepper-btn ${btnSize}`}
        aria-label="Aumentar cantidad"
        disabled={max !== undefined && value >= max}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
