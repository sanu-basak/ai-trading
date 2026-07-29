import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader, Card, EmptyState, Spinner, Stat } from '@/components/ui/misc';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { InstrumentPicker } from '@/components/InstrumentPicker';
import { cn } from '@/lib/cn';
import { apiErrorMessage } from '@/lib/api/client';
import type { Instrument } from '@/types';
import {
  useCreatePaperAccount,
  usePaperAccount,
  usePaperAccounts,
  usePlaceOrder,
} from './api';

function money(n: number | null | undefined): string {
  return n === null || n === undefined
    ? '—'
    : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
const tone = (n: number | null | undefined) =>
  n === null || n === undefined ? undefined : n >= 0 ? 'up' : 'down';

export function PaperTradingPage() {
  const accounts = usePaperAccounts();
  const create = useCreatePaperAccount();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [capital, setCapital] = useState('100000');

  const activeId = selectedId ?? accounts.data?.[0]?.id ?? null;
  const account = usePaperAccount(activeId);

  return (
    <div>
      <PageHeader
        title="Paper Trading"
        subtitle="Practice with simulated capital. Orders fill against live market prices."
      />

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        {/* Accounts */}
        <div>
          <Card className="mb-3 p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cap = Number(capital);
                if (name.trim() && cap > 0)
                  create.mutate(
                    { name: name.trim(), startingCapital: cap },
                    { onSuccess: () => setName('') },
                  );
              }}
              className="space-y-2"
            >
              <Input placeholder="Account name…" value={name} onChange={(e) => setName(e.target.value)} />
              <Input
                type="number"
                placeholder="Starting capital"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
              />
              <Button type="submit" className="w-full" loading={create.isPending}>
                <Plus className="h-4 w-4" /> Create account
              </Button>
            </form>
          </Card>

          {accounts.isLoading ? (
            <Spinner />
          ) : accounts.data && accounts.data.length > 0 ? (
            <div className="space-y-1">
              {accounts.data.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedId(acc.id)}
                  className={cn(
                    'block w-full rounded-lg px-3 py-2 text-left text-sm',
                    acc.id === activeId ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-surface-2',
                  )}
                >
                  <div className="font-medium">{acc.name}</div>
                  <div className="text-xs">
                    {acc.currency} {money(acc.cashBalance)} cash
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState>Create a paper account to start.</EmptyState>
          )}
        </div>

        {/* Detail */}
        <div className="space-y-6">
          {!activeId ? (
            <EmptyState>Select or create an account.</EmptyState>
          ) : account.isLoading ? (
            <Spinner />
          ) : account.data ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Equity" value={money(account.data.summary.equity)} />
                <Stat label="Cash" value={money(account.data.summary.cashBalance)} />
                <Stat
                  label="Unrealized"
                  value={money(account.data.summary.unrealizedPnl)}
                  tone={tone(account.data.summary.unrealizedPnl)}
                />
                <Stat
                  label="Return"
                  value={`${account.data.summary.totalReturnPct.toFixed(2)}%`}
                  tone={tone(account.data.summary.totalReturnPct)}
                />
              </div>

              <OrderTicket accountId={activeId} />

              <Card>
                <div className="mb-3 text-sm font-semibold text-slate-100">Open positions</div>
                {account.data.positions.length === 0 ? (
                  <EmptyState>No open positions.</EmptyState>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted">
                      <tr className="border-b border-border">
                        <th className="py-2">Symbol</th>
                        <th className="py-2">Side</th>
                        <th className="py-2">Qty</th>
                        <th className="py-2">Avg</th>
                        <th className="py-2">Price</th>
                        <th className="py-2 text-right">Unrealized</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.data.positions.map((p) => (
                        <tr key={p.instrumentId} className="border-b border-border/60 last:border-0">
                          <td className="py-2 font-medium text-slate-100">{p.symbol}</td>
                          <td className={cn('py-2', p.side === 'LONG' ? 'text-bull' : 'text-bear')}>
                            {p.side}
                          </td>
                          <td className="py-2">{p.quantity}</td>
                          <td className="py-2">{money(p.avgEntryPrice)}</td>
                          <td className="py-2">{p.currentPrice === null ? '—' : money(p.currentPrice)}</td>
                          <td
                            className={cn(
                              'py-2 text-right',
                              p.unrealizedPnl === null
                                ? 'text-muted'
                                : p.unrealizedPnl >= 0
                                  ? 'text-bull'
                                  : 'text-bear',
                            )}
                          >
                            {money(p.unrealizedPnl)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OrderTicket({ accountId }: { accountId: string }) {
  const place = usePlaceOrder(accountId);
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [type, setType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [qty, setQty] = useState('1');
  const [limitPrice, setLimitPrice] = useState('');

  const submit = () => {
    if (!instrument) return;
    place.mutate({
      instrumentId: instrument.id,
      side,
      type,
      quantity: Number(qty),
      limitPrice: type === 'LIMIT' ? Number(limitPrice) : undefined,
    });
  };

  return (
    <Card>
      <div className="mb-3 text-sm font-semibold text-slate-100">Place order</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <span className="label">Instrument</span>
          <InstrumentPicker value={instrument} onChange={setInstrument} />
        </div>
        <div>
          <span className="label">Side</span>
          <div className="grid grid-cols-2 gap-2">
            {(['BUY', 'SELL'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                className={cn(
                  'btn-ghost',
                  side === s && (s === 'BUY' ? 'border-bull text-bull' : 'border-bear text-bear'),
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Type</span>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as 'MARKET' | 'LIMIT')}>
            <option value="MARKET">Market</option>
            <option value="LIMIT">Limit</option>
          </select>
        </div>
        <Input label="Quantity" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
        {type === 'LIMIT' && (
          <Input
            label="Limit price"
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
          />
        )}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={submit} disabled={!instrument} loading={place.isPending}>
          Submit order
        </Button>
        {place.isError && <span className="text-sm text-bear">{apiErrorMessage(place.error)}</span>}
        {place.data && (
          <span className="text-sm text-muted">
            {place.data.status === 'FILLED'
              ? `Filled @ ${money(place.data.fillPrice)}`
              : 'Order placed (open)'}
          </span>
        )}
      </div>
    </Card>
  );
}
