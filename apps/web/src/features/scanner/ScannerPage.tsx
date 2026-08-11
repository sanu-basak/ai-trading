import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Radar, Sparkles } from 'lucide-react';
import { PageHeader, Card, EmptyState, SignalBadge } from '@/components/ui/misc';
import { Button } from '@/components/ui/Button';
import { apiErrorMessage } from '@/lib/api/client';
import { useWatchlists } from '@/features/watchlist/api';
import { useScanWatchlist } from './api';

const TIMEFRAMES = ['15m', '1h', '4h', '1d'] as const;
const SIGNALS = ['', 'BUY', 'SELL', 'WATCH', 'NO_TRADE'];

export function ScannerPage() {
  const watchlists = useWatchlists();
  const scan = useScanWatchlist();
  const [watchlistId, setWatchlistId] = useState('');
  const [timeframe, setTimeframe] = useState('1d');
  const [signal, setSignal] = useState('');

  const activeId = watchlistId || watchlists.data?.[0]?.id || '';

  const run = () => {
    if (activeId) scan.mutate({ watchlistId: activeId, timeframe, signal: signal || undefined });
  };

  return (
    <div>
      <PageHeader
        title="Scanner"
        subtitle="Run the AI signal engine across a whole watchlist and rank what matters."
      />

      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="label">Watchlist</span>
            <select className="input" value={activeId} onChange={(e) => setWatchlistId(e.target.value)}>
              {watchlists.data?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.itemCount})
                </option>
              ))}
            </select>
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
            <span className="label">Signal filter</span>
            <select className="input" value={signal} onChange={(e) => setSignal(e.target.value)}>
              {SIGNALS.map((s) => (
                <option key={s} value={s}>
                  {s === '' ? 'Any' : s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={run} disabled={!activeId} loading={scan.isPending} className="w-full">
              <Radar className="h-4 w-4" /> Scan
            </Button>
          </div>
        </div>
        {scan.isError && <p className="mt-3 text-sm text-bear">{apiErrorMessage(scan.error)}</p>}
      </Card>

      {!scan.data ? (
        <EmptyState>Pick a watchlist and scan to rank its instruments by AI signal.</EmptyState>
      ) : scan.data.results.length === 0 ? (
        <EmptyState>
          Scanned {scan.data.scanned} instruments — none matched. Try a different filter or timeframe.
        </EmptyState>
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between px-4 py-3 text-xs text-muted">
            <span>
              {scan.data.matched} of {scan.data.scanned} matched · {scan.data.timeframe}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr className="border-t border-border">
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Signal</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Trend</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {scan.data.results.map((r) => (
                <tr key={r.instrumentId} className="border-t border-border/60 hover:bg-surface-2/50">
                  <td className="px-4 py-3 font-medium text-slate-100">{r.symbol}</td>
                  <td className="px-4 py-3"><SignalBadge type={r.signal} /></td>
                  <td className="px-4 py-3 tabular-nums">{r.confidence.toFixed(0)}%</td>
                  <td className="px-4 py-3 text-muted">{r.trend}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {r.price === null ? '—' : r.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/analyze?instrumentId=${r.instrumentId}`} className="inline-flex items-center gap-1 text-accent hover:underline">
                      <Sparkles className="h-3.5 w-3.5" /> Analyze
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-[11px] text-muted">{scan.data.disclaimer}</p>
        </Card>
      )}
    </div>
  );
}
