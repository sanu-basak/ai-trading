import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { SignalType } from '@/types';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('card', className)}>{children}</div>;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-muted', className)} />;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

const SIGNAL_STYLES: Record<SignalType, string> = {
  BUY: 'bg-bull/15 text-bull border-bull/30',
  SELL: 'bg-bear/15 text-bear border-bear/30',
  WATCH: 'bg-watch/15 text-watch border-watch/30',
  NO_TRADE: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

export function SignalBadge({ type, className }: { type: SignalType; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold',
        SIGNAL_STYLES[type],
        className,
      )}
    >
      {type.replace('_', ' ')}
    </span>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div
        className={cn(
          'mt-0.5 text-sm font-semibold',
          tone === 'up' && 'text-bull',
          tone === 'down' && 'text-bear',
          !tone && 'text-slate-100',
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center text-sm text-muted">
      {children}
    </div>
  );
}
