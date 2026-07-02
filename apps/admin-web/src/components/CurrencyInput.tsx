'use client';

import { formatAmountInput, parseAmount } from '../lib/currency';

type Props = {
  value: string;
  onChange: (numericValue: number, displayValue: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  id?: string;
};

export function CurrencyInput({ value, onChange, placeholder, className = 'input', autoFocus, id }: Props) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">RD$</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          const display = formatAmountInput(e.target.value);
          onChange(parseAmount(display), display);
        }}
        className={`${className} !pl-12 font-semibold tabular-nums text-slate-900`}
      />
    </div>
  );
}
