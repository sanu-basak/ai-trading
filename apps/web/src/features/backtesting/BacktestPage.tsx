import { useState } from 'react';
import { Play } from 'lucide-react';
import { PageHeader, Card, Stat, EmptyState } from '@/components/ui/misc';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { InstrumentPicker } from '@/components/InstrumentPicker';
import { apiErrorMessage } from '@/lib/api/client';
import type { Instrument } from '@/types';
import { useBacktest } from './api';
import { EquityCurve } from './EquityCurve';

const TIMEFRAMES = ['1h', '4h', '1d', '1w'] as const;
const STRATEGIES = [
  { value: 'ema_cross', label: 'EMA Cross' },
  { value: 'rsi_reversion', label: 'RSI Reversion' },
  { value: 'supertrend', label: 'SuperTrend' },
];

function m(v: number | null | undefined, digits = 2): string {
  return v === null || v === undefined ? '—' : v.toLocaleString(undefined, { maximumFractionDigits: digits });
}
const tone = (v: number | null | undefined) =>
  v === null || v === undefined ? undefined : v >= 0 ? 'up' : 'down';

export function BacktestPage() {
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [timeframe, setTimeframe] = useState('1d');
  const [strategy, setStrategy] = useState('ema_cross');
  const [capital, setCapital] = useState('100000');
  const backtest = useBacktest();

  const run = () => {
    if (!instrument) return;
    backtest.mutate({
      instrumentId: instrument.id,
      timeframe,
      strategy,
      initialCapital: Number(capital) || 100000,
    });
  };

  const result = backtest.data;
  const metrics = result?.metrics ?? {};

  return (
    <div>
      <PageHeader
        title="Backtesting"
        subtitle="Test a rule-based strategy over real historical candles. Past performance never guarantees future results."
      />

      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <span className="label">Instrument</span>
            <InstrumentPicker value={instrument} onChange={setInstrument} />
          </div>
          <div>
            <span className="label">Timeframe</span>
            <select className="input" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
              {TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>
                  {tf}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">Strategy</span>
            <select className="input" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
              {STRATEGIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <Input label="Capital" type="number" value={capital} onChange={(e) => setCapital(e.target.value)} />
        </div>
        <div className="mt-4">
          <Button onClick={run} disabled={!instrument} loading={backtest.isPending}>
            <Play className="h-4 w-4" /> Run backtest
          </Button>
          {backtest.isError && <span className="ml-3 text-sm text-bear">{apiErrorMessage(backtest.error)}</span>}
        </div>
      </Card>

      {!result ? (
        <EmptyState>Pick an instrument and run a backtest to see the equity curve and metrics.</EmptyState>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Return" value={`${m(metrics.total_return_pct)}%`} tone={tone(metrics.total_return_pct)} />
            <Stat label="Win rate" value={`${m(metrics.win_rate, 0)}%`} />
            <Stat label="Profit factor" value={metrics.profit_factor === null ? '∞' : m(metrics.profit_factor)} />
            <Stat label="Max DD" value={`${m(metrics.max_drawdown_pct)}%`} tone="down" />
            <Stat label="Sharpe" value={m(metrics.sharpe)} />
            <Stat label="Trades" value={m(metrics.total_trades, 0)} />
          </div>

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-100">Equity curve</div>
              <div className="text-xs text-muted">
                {m(result.initialCapital, 0)} → {m(result.finalEquity, 0)}
              </div>
            </div>
            <EquityCurve points={result.equityCurve} baseline={result.initialCapital} />
          </Card>

          <Card>
            <p className="text-sm leading-relaxed text-slate-300">{result.summary}</p>
            <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-muted">
              {result.disclaimer}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
