import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card, SignalBadge, Stat } from '@/components/ui/misc';
import type { Signal } from '@/types';

function fmt(n: number | null | undefined, digits = 2): string {
  return n === null || n === undefined ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function SignalCard({ signal }: { signal: Signal }) {
  const directional = signal.type === 'BUY' || signal.type === 'SELL';
  const ind = signal.indicators;

  return (
    <Card className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-100">{signal.symbol}</h3>
            <span className="text-xs text-muted">
              {signal.exchange} · {signal.timeframe}
            </span>
          </div>
          <p className="text-xs text-muted">{signal.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <SignalBadge type={signal.type} />
          <div className="text-right">
            <div className="text-xs text-muted">Confidence</div>
            <div className="text-sm font-semibold text-slate-100">{fmt(signal.confidence, 1)}%</div>
          </div>
        </div>
      </div>

      {signal.summary && <p className="text-sm leading-relaxed text-slate-300">{signal.summary}</p>}

      {/* Trade levels */}
      {directional && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Entry" value={fmt(signal.entry)} />
          <Stat label="Stop" value={fmt(signal.stopLoss)} tone="down" />
          <Stat label="Target 1" value={fmt(signal.targets[0]?.price)} tone="up" />
          <Stat label="R:R" value={signal.riskReward ? `${fmt(signal.riskReward, 1)}:1` : '—'} />
        </div>
      )}

      {/* Reasons */}
      {signal.reasons.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Why this call
          </div>
          <ul className="space-y-1.5">
            {[...signal.reasons]
              .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
              .map((r) => (
                <li key={r.name} className="flex items-start gap-2 text-sm">
                  {r.direction === 'bullish' ? (
                    <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bull" />
                  ) : r.direction === 'bearish' ? (
                    <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bear" />
                  ) : (
                    <span className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="text-slate-300">{r.detail}</span>
                  <span
                    className={cn(
                      'ml-auto shrink-0 tabular-nums text-xs',
                      r.contribution > 0 ? 'text-bull' : r.contribution < 0 ? 'text-bear' : 'text-muted',
                    )}
                  >
                    {r.contribution > 0 ? '+' : ''}
                    {r.contribution.toFixed(3)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Rejection / cautions */}
      {signal.rejection.length > 0 && (
        <div className="rounded-lg border border-watch/30 bg-watch/10 p-3">
          {signal.rejection.map((r, i) => (
            <p key={i} className="flex items-start gap-2 text-sm text-watch">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {r}
            </p>
          ))}
        </div>
      )}

      {/* Indicator snapshot */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Indicators</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="RSI(14)" value={fmt(ind.rsi14, 1)} />
          <Stat label="ADX(14)" value={fmt(ind.adx14, 1)} />
          <Stat label="EMA50" value={fmt(ind.ema50)} />
          <Stat label="EMA200" value={fmt(ind.ema200)} />
        </div>
      </div>

      {signal.disclaimer && (
        <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted">
          {signal.disclaimer}
        </p>
      )}
    </Card>
  );
}
