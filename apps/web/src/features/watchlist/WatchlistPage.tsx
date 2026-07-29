import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Star, Trash2, Sparkles } from 'lucide-react';
import { PageHeader, Card, EmptyState, Spinner } from '@/components/ui/misc';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { InstrumentPicker } from '@/components/InstrumentPicker';
import { cn } from '@/lib/cn';
import {
  useAddWatchlistItem,
  useCreateWatchlist,
  useRemoveWatchlistItem,
  useWatchlistDetail,
  useWatchlists,
} from './api';

export function WatchlistPage() {
  const lists = useWatchlists();
  const create = useCreateWatchlist();
  const [name, setName] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeId = selectedId ?? lists.data?.[0]?.id ?? null;
  const detail = useWatchlistDetail(activeId);
  const addItem = useAddWatchlistItem(activeId ?? '');
  const removeItem = useRemoveWatchlistItem(activeId ?? '');

  return (
    <div>
      <PageHeader title="Watchlists" subtitle="Track the instruments you care about." />

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        {/* Left: lists */}
        <div>
          <Card className="mb-3 p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) create.mutate(name.trim(), { onSuccess: () => setName('') });
              }}
              className="flex gap-2"
            >
              <Input placeholder="New watchlist…" value={name} onChange={(e) => setName(e.target.value)} />
              <Button type="submit" loading={create.isPending} aria-label="Create">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </Card>

          {lists.isLoading ? (
            <Spinner />
          ) : lists.data && lists.data.length > 0 ? (
            <div className="space-y-1">
              {lists.data.map((wl) => (
                <button
                  key={wl.id}
                  onClick={() => setSelectedId(wl.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm',
                    wl.id === activeId ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-surface-2',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5" /> {wl.name}
                  </span>
                  <span className="text-xs">{wl.itemCount}</span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState>Create your first watchlist.</EmptyState>
          )}
        </div>

        {/* Right: items */}
        <div>
          {!activeId ? (
            <EmptyState>Select or create a watchlist to add instruments.</EmptyState>
          ) : (
            <Card>
              <div className="mb-4 max-w-sm">
                <span className="label">Add instrument</span>
                <InstrumentPicker value={null} onChange={(inst) => addItem.mutate(inst.id)} />
                {addItem.isError && <p className="mt-1 text-xs text-bear">Could not add (already present?).</p>}
              </div>

              {detail.isLoading ? (
                <Spinner />
              ) : detail.data && detail.data.items.length > 0 ? (
                <table className="w-full text-sm">
                  <tbody>
                    {detail.data.items.map((item) => (
                      <tr key={item.id} className="border-b border-border/60 last:border-0">
                        <td className="py-2 font-medium text-slate-100">{item.symbol}</td>
                        <td className="py-2 text-muted">{item.name}</td>
                        <td className="py-2 text-xs text-muted">{item.exchange}</td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              to={`/analyze?instrumentId=${item.instrumentId}`}
                              className="text-accent hover:underline"
                              title="Analyze"
                            >
                              <Sparkles className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => removeItem.mutate(item.instrumentId)}
                              className="text-muted hover:text-bear"
                              title="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState>No instruments yet — add one above.</EmptyState>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
