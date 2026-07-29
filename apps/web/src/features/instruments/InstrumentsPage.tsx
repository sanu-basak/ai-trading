import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { PageHeader, Card, Spinner, EmptyState } from '@/components/ui/misc';
import { Input } from '@/components/ui/Input';
import { useSearchInstruments } from './api';

export function InstrumentsPage() {
  const [query, setQuery] = useState('');
  const { data, isFetching } = useSearchInstruments(query, true);

  return (
    <div>
      <PageHeader title="Instruments" subtitle="Search markets across NSE, BSE, crypto and more." />
      <div className="mb-4 max-w-md">
        <Input
          placeholder="Search symbol or name (e.g. BTCUSDT, RELIANCE)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <Card className="p-0">
        {isFetching && (
          <div className="flex items-center gap-2 p-4 text-sm text-muted">
            <Spinner className="h-4 w-4" /> Searching…
          </div>
        )}
        {!isFetching && (!data || data.length === 0) && (
          <div className="p-4">
            <EmptyState>No instruments found. Try a different search.</EmptyState>
          </div>
        )}
        {data && data.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Exchange</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((inst) => (
                <tr key={inst.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/50">
                  <td className="px-4 py-3 font-medium text-slate-100">{inst.symbol}</td>
                  <td className="px-4 py-3 text-muted">{inst.name}</td>
                  <td className="px-4 py-3">{inst.exchange.code}</td>
                  <td className="px-4 py-3">{inst.assetClass}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/analyze?instrumentId=${inst.id}`}
                      className="inline-flex items-center gap-1 text-accent hover:underline"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Analyze
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
