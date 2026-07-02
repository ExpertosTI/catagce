import { ReactNode } from 'react';

type Props = {
  title: string;
  emoji?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function ReportTableCard({ title, emoji, subtitle, actions, children }: Props) {
  return (
    <div className="executive-card overflow-hidden !p-0 shadow-md shadow-slate-200/50">
      <div className="px-4 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="font-bold text-sm flex items-center gap-2 text-slate-900">
            {emoji && <span className="text-base" aria-hidden>{emoji}</span>} {title}
          </p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5 font-medium">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-1.5">{actions}</div>}
      </div>
      <div className="overflow-x-auto report-table">{children}</div>
    </div>
  );
}
