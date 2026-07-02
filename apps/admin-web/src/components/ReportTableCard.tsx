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
    <div className="executive-card overflow-hidden !p-0">
      <div className="px-4 py-3 border-b bg-slate-50/80 flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="font-semibold text-sm flex items-center gap-1.5">
            {emoji && <span aria-hidden>{emoji}</span>} {title}
          </p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="action-bar !p-1.5 !bg-transparent !border-0">{actions}</div>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
