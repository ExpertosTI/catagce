import Link from 'next/link';
import type { ReactNode } from 'react';
import { Layers3 } from 'lucide-react';

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-11 h-11 rounded-xl bg-[#635BFF] flex items-center justify-center shadow-sm">
              <Layers3 className="w-6 h-6 text-white" strokeWidth={2.2} />
            </div>
            <span className="text-[1.65rem] font-bold tracking-tight text-[#1A1D26]">Catagce</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1A1D26] text-center">{title}</h1>
          {subtitle && <p className="text-sm text-[#6B7280] mt-2 text-center">{subtitle}</p>}
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EAED] shadow-[0_8px_30px_rgba(17,24,39,0.06)] p-8">
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-[#6B7280]">{footer}</div>}
      </div>
    </div>
  );
}

export function AuthInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#374151] mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="w-full h-12 px-4 rounded-xl border border-[#D1D5DB] bg-white text-[#111827] placeholder:text-[#9CA3AF] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/25 focus:border-[#635BFF] transition"
      />
    </label>
  );
}

export function AuthButton({
  children,
  loading,
  disabled,
  type = 'submit',
}: {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: 'submit' | 'button';
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className="w-full h-12 rounded-xl bg-[#635BFF] hover:bg-[#564FE8] text-white font-semibold text-[15px] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-[#635BFF] font-medium hover:text-[#564FE8] hover:underline">
      {children}
    </Link>
  );
}
