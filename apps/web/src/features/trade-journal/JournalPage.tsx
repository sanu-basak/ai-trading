import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { PageHeader, Card, Stat, EmptyState, Spinner } from '@/components/ui/misc';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { InstrumentPicker } from '@/components/InstrumentPicker';
import { cn } from '@/lib/cn';
import { apiErrorMessage } from '@/lib/api/client';
import type { Instrument } from '@/types';
import { useCloseTrade, useCreateTrade, useDeleteTrade, useJournalStats, useJournalTrades } from './api';

function money(n: number | null | undefined): string {
  return n === null || n === undefined
    ? '—'
    : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
const tone = (n: number | null | undefined) =>
  n === null || n === undefined ? undefined : n >= 0 ? 'up' : 'down';

export function JournalPage() {
  const trades = useJournalTrades();
  const stats = useJournalStats();

  return (
    <div>
      <PageHeader title="Trade Journal" subtitle="Log trades, review, and learn from your performance." />

      {/* Stats */}
      {stats.data && stats.data.totalTrades > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Net P&L" value={money(stats.data.totalPnl)} tone={tone(stats.data.totalPnl)} />
          <Stat label="Win rate" value={`${stats.data.winRate.toFixed(0)}%`} />
          <Stat label="Profit factor" value={stats.data.profitFactor?.toFixed(2) ?? '∞'} />
          <Stat label="Expectancy" value={money(stats.data.expectancy)} tone={tone(stats.data.expectancy)} />
          <Stat label="Avg R" value={stats.data.avgRMultiple?.toFixed(2) ?? '—'} />
          <Stat label="Trades" value={String(stats.data.totalTrades)} />
        </div>
      )}

      <NewTradeForm />

      {/* Trades */}
      <Card className="mt-6 p-0">
        {trades.isLoading ? (
          <div className="p-4">
            <Spinner />
          </div>
        ) : !trades.data || trades.data.length === 0 ? (
          <div className="p-4">
            <EmptyState>No trades logged yet. Add your first above.</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted">
                <tr className="border-b border-border">
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3">Side</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Entry</th>
                  <th className="px-4 py-3">Exit</th>
                  <th className="px-4 py-3 text-right">P&L</th>
                  <th className="px-4 py-3 text-right">R</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {trades.data.map((t) => (
                  <TradeRow key={t.id} trade={t} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function TradeRow({ trade }: { trade: import('@/types').JournalTrade }) {
  const close = useCloseTrade();
  const remove = useDeleteTrade();
  const [closing, setClosing] = useState(false);
  const [exitPrice, setExitPrice] = useState('');

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-4 py-3 font-medium text-slate-100">{trade.symbol}</td>
      <td className={cn('px-4 py-3', trade.side === 'LONG' ? 'text-bull' : 'text-bear')}>{trade.side}</td>
      <td className="px-4 py-3 text-muted">{trade.status}</td>
      <td className="px-4 py-3">{trade.quantity}</td>
      <td className="px-4 py-3">{money(trade.entryPrice)}</td>
      <td className="px-4 py-3">{trade.exitPrice === null ? '—' : money(trade.exitPrice)}</td>
      <td className={cn('px-4 py-3 text-right', trade.pnl === null ? 'text-muted' : trade.pnl >= 0 ? 'text-bull' : 'text-bear')}>
        {trade.pnl === null ? '—' : money(trade.pnl)}
      </td>
      <td className="px-4 py-3 text-right text-muted">{trade.rMultiple?.toFixed(2) ?? '—'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {trade.status === 'OPEN' && !closing && (
            <button className="text-xs text-accent hover:underline" onClick={() => setClosing(true)}>
              Close
            </button>
          )}
          {trade.status === 'OPEN' && closing && (
            <span className="flex items-center gap-1">
              <input
                className="input h-7 w-24 px-2 py-1 text-xs"
                type="number"
                placeholder="Exit price"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
              />
              <button
                className="text-xs text-bull hover:underline"
                onClick={() => {
                  const price = Number(exitPrice);
                  if (price > 0) close.mutate({ id: trade.id, exitPrice: price }, { onSuccess: () => setClosing(false) });
                }}
              >
                OK
              </button>
              <button className="text-muted hover:text-slate-200" onClick={() => setClosing(false)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          <button className="text-muted hover:text-bear" onClick={() => remove.mutate(trade.id)} title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function NewTradeForm() {
  const create = useCreateTrade();
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [side, setSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [quantity, setQuantity] = useState('1');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [notes, setNotes] = useState('');

  const submit = () => {
    if (!instrument || !entryPrice) return;
    create.mutate(
      {
        instrumentId: instrument.id,
        side,
        quantity: Number(quantity),
        entryPrice: Number(entryPrice),
        entryAt: new Date().toISOString(),
        stopLoss: stopLoss ? Number(stopLoss) : null,
        exitPrice: exitPrice ? Number(exitPrice) : null,
        notes: notes || null,
      },
      {
        onSuccess: () => {
          setEntryPrice('');
          setStopLoss('');
          setExitPrice('');
          setNotes('');
        },
      },
    );
  };

  return (
    <Card>
      <div className="mb-3 text-sm font-semibold text-slate-100">Log a trade</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <span className="label">Instrument</span>
          <InstrumentPicker value={instrument} onChange={setInstrument} />
        </div>
        <div>
          <span className="label">Side</span>
          <select className="input" value={side} onChange={(e) => setSide(e.target.value as 'LONG' | 'SHORT')}>
            <option value="LONG">Long</option>
            <option value="SHORT">Short</option>
          </select>
        </div>
        <Input label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <Input label="Entry price" type="number" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
        <Input label="Stop loss (optional)" type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
        <Input
          label="Exit price (optional — logs a closed trade)"
          type="number"
          value={exitPrice}
          onChange={(e) => setExitPrice(e.target.value)}
        />
        <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="lg:col-span-2" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={submit} disabled={!instrument || !entryPrice} loading={create.isPending}>
          <Plus className="h-4 w-4" /> Add trade
        </Button>
        {create.isError && <span className="text-sm text-bear">{apiErrorMessage(create.error)}</span>}
      </div>
    </Card>
  );
}
