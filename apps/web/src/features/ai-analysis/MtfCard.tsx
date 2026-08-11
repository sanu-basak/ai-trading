import { Layers } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card, SignalBadge } from '@/components/ui/misc';
import type { MtfResult } from '@/types';

const ALIGNMENT_LABEL: Record<string, string> = {
  aligned_bullish: 'Aligned bullish',
  aligned_bearish: 'Aligned bearish',
  mixed: 'Timeframes conflict',
  neutral: 'Neutral',
};

export function MtfCard({ mtf }: { mtf: MtfResult }) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-slate-100">Multi-timeframe confluence</h3>
        </div>
        <div className="flex items-center gap-3">
          <SignalBadge type={mtf.signal} />
          <span className="text-sm text-muted">{mtf.confidence.toFixed(0)}%</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span
          className={cn(
            'rounded-md border px-2 py-0.5 font-medium',
            mtf.alignment === 'aligned_bullish'
              ? 'border-bull/30 bg-bull/10 text-bull'
              : mtf.alignment === 'aligned_bearish'
                ? 'border-bear/30 bg-bear/10 text-bear'
                : 'border-watch/30 bg-watch/10 text-watch',
          )}
        >
          {ALIGNMENT_LABEL[mtf.alignment] ?? mtf.alignment}
        </span>
        <span className="text-muted">
          composite {mtf.compositeScore > 0 ? '+' : ''}
          {mtf.compositeScore.toFixed(2)}
        </span>
      </div>

      {/* Per-timeframe breakdown */}
      <div className="grid gap-2 sm:grid-cols-3">
        {mtf.frames.map((f) => (
          <div key={f.timeframe} className="rounded-lg border border-border bg-surface-2 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-100">{f.timeframe}</span>
              <SignalBadge type={f.signal} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{f.trend}</span>
              <span className={cn('tabular-nums', f.score >= 0 ? 'text-bull' : 'text-bear')}>
                {f.score > 0 ? '+' : ''}
                {f.score.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {mtf.summary && <p className="text-sm leading-relaxed text-slate-300">{mtf.summary}</p>}
      <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted">
        {mtf.disclaimer}
      </p>
    </Card>
  );
}
