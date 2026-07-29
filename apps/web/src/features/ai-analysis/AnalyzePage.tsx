import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { PageHeader, Card, SignalBadge, EmptyState, Spinner } from '@/components/ui/misc';
import { Button } from '@/components/ui/Button';
import { InstrumentPicker } from '@/components/InstrumentPicker';
import { apiErrorMessage } from '@/lib/api/client';
import { useInstrument } from '@/features/instruments/api';
import type { Instrument } from '@/types';
import { useAnalyze, useSignals } from './api';
import { SignalCard } from './SignalCard';

const TIMEFRAMES = ['5m', '15m', '1h', '4h', '1d', '1w'] as const;

export function AnalyzePage() {
  const [params] = useSearchParams();
  const urlInstrumentId = params.get('instrumentId');
  const { data: urlInstrument } = useInstrument(urlInstrumentId);

  const [selected, setSelected] = useState<Instrument | null>(null);
  const [timeframe, setTimeframe] = useState<string>('1d');
  const analyze = useAnalyze();
  const signals = useSignals();

  // Preselect the instrument passed via ?instrumentId=
  useEffect(() => {
    if (urlInstrument && !selected) setSelected(urlInstrument);
  }, [urlInstrument, selected]);

  const run = () => {
    if (selected) analyze.mutate({ instrumentId: selected.id, timeframe });
  };

  return (
    <div>
      <PageHeader
        title="AI Analysis"
        subtitle="Explainable BUY / SELL / NO_TRADE / WATCH signals from live market data."
      />

      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div>
            <span className="label">Instrument</span>
            <InstrumentPicker value={selected} onChange={setSelected} />
          </div>
          <div>
            <span className="label">Timeframe</span>
            <select
              className="input"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>
                  {tf}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={run} disabled={!selected} loading={analyze.isPending} className="w-full">
              <Sparkles className="h-4 w-4" /> Analyze
            </Button>
          </div>
        </div>
        {analyze.isError && (
          <p className="mt-3 text-sm text-bear">{apiErrorMessage(analyze.error)}</p>
        )}
      </Card>

      {analyze.data && (
        <div className="mb-8">
          <SignalCard signal={analyze.data} />
        </div>
      )}

      {/* Recent signals */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Recent signals</h2>
      {signals.isLoading ? (
        <Spinner />
      ) : !signals.data || signals.data.length === 0 ? (
        <EmptyState>No signals yet. Run your first analysis above.</EmptyState>
      ) : (
        <div className="space-y-2">
          {signals.data.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <SignalBadge type={s.type} />
                <span className="font-medium text-slate-100">{s.symbol}</span>
                <span className="text-muted">{s.timeframe}</span>
              </div>
              <div className="flex items-center gap-4 text-muted">
                <span>{s.confidence.toFixed(0)}%</span>
                <span className="hidden sm:inline">{new Date(s.generatedAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
