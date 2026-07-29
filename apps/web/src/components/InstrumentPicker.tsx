import { useState } from 'react';
import { Search } from 'lucide-react';
import { useSearchInstruments } from '@/features/instruments/api';
import type { Instrument } from '@/types';

interface Props {
  value: Instrument | null;
  onChange: (instrument: Instrument) => void;
  placeholder?: string;
}

/** A search-and-select combobox for instruments. */
export function InstrumentPicker({ value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { data: results, isFetching } = useSearchInstruments(query, query.length > 0);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
        <input
          className="input pl-9"
          placeholder={placeholder ?? 'Search symbol or name…'}
          value={open ? query : (value ? `${value.symbol} · ${value.name}` : query)}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
      </div>

      {open && query.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-surface-2 shadow-lg">
          {isFetching && <div className="px-3 py-2 text-sm text-muted">Searching…</div>}
          {!isFetching && results?.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted">No matches</div>
          )}
          {results?.map((inst) => (
            <button
              key={inst.id}
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface"
              onClick={() => {
                onChange(inst);
                setOpen(false);
                setQuery('');
              }}
            >
              <span>
                <span className="font-medium text-slate-100">{inst.symbol}</span>
                <span className="ml-2 text-muted">{inst.name}</span>
              </span>
              <span className="text-xs text-muted">
                {inst.exchange.code} · {inst.assetClass}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
