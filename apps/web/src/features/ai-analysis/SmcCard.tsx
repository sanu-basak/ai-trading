import { Boxes } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/misc';
import type { SmcResult } from '@/types';

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function biasClass(bias: string): string {
  return bias === 'bullish'
    ? 'border-bull/30 bg-bull/10 text-bull'
    : bias === 'bearish'
      ? 'border-bear/30 bg-bear/10 text-bear'
      : 'border-border bg-surface-2 text-slate-300';
}

export function SmcCard({ smc }: { smc: SmcResult }) {
  const pd = smc.premiumDiscount;
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Boxes className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-slate-100">Smart-Money Concepts</h3>
          <span className="text-xs text-muted">
            {smc.symbol} · {smc.timeframe}
          </span>
        </div>
        <span className={cn('rounded-md border px-2 py-0.5 text-xs font-semibold', biasClass(smc.bias))}>
          {smc.bias} bias
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Info label="Structure" value={smc.structure} />
        {smc.lastEvent && (
          <Info
            label="Last event"
            value={`${smc.lastEvent.direction} ${smc.lastEvent.kind}`}
            tone={smc.lastEvent.direction === 'bullish' ? 'up' : 'down'}
          />
        )}
        {pd && <Info label="Zone" value={pd.zone} />}
        {pd && <Info label="Equilibrium" value={fmt(pd.equilibrium)} />}
      </div>

      {/* Order blocks */}
      {smc.orderBlocks.length > 0 && (
        <Section title="Order blocks">
          {smc.orderBlocks.map((ob, i) => (
            <Chip
              key={i}
              tone={ob.kind === 'bullish' ? 'up' : 'down'}
              label={`${ob.kind} ${fmt(ob.bottom)}–${fmt(ob.top)}${ob.mitigated ? ' (mitigated)' : ''}`}
            />
          ))}
        </Section>
      )}

      {/* Fair value gaps */}
      {smc.fairValueGaps.length > 0 && (
        <Section title="Fair-value gaps">
          {smc.fairValueGaps.map((g, i) => (
            <Chip
              key={i}
              tone={g.kind === 'bullish' ? 'up' : 'down'}
              label={`${g.kind} ${fmt(g.bottom)}–${fmt(g.top)}${g.filled ? ' (filled)' : ''}`}
            />
          ))}
        </Section>
      )}

      {/* Liquidity */}
      {smc.liquidity.length > 0 && (
        <Section title="Liquidity pools">
          {smc.liquidity.slice(0, 8).map((lq, i) => (
            <Chip
              key={i}
              tone={lq.kind === 'buy_side' ? 'up' : 'down'}
              label={`${lq.kind === 'buy_side' ? 'buy-side' : 'sell-side'} ${fmt(lq.price)} ×${lq.touches}`}
            />
          ))}
        </Section>
      )}

      {smc.summary && <p className="text-sm leading-relaxed text-slate-300">{smc.summary}</p>}
      <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted">{smc.disclaimer}</p>
    </Card>
  );
}

function Info({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div
        className={cn(
          'mt-0.5 text-sm font-semibold capitalize',
          tone === 'up' && 'text-bull',
          tone === 'down' && 'text-bear',
          !tone && 'text-slate-100',
        )}
      >
        {value.replace('_', ' ')}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ label, tone }: { label: string; tone: 'up' | 'down' }) {
  return (
    <span
      className={cn(
        'rounded-md border px-2 py-1 text-xs',
        tone === 'up' ? 'border-bull/30 bg-bull/10 text-bull' : 'border-bear/30 bg-bear/10 text-bear',
      )}
    >
      {label}
    </span>
  );
}
