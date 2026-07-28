import type { Watchlist } from './watchlist.entity';

/** A watchlist item joined with its instrument reference (read shape). */
export interface WatchlistItemRecord {
  id: string;
  instrumentId: string;
  note: string | null;
  sortOrder: number;
  symbol: string;
  name: string;
  assetClass: string;
  exchange: string;
}

export interface WatchlistWithCount {
  watchlist: Watchlist;
  itemCount: number;
}

export interface IWatchlistRepository {
  create(watchlist: Watchlist): Promise<void>;
  save(watchlist: Watchlist): Promise<void>;
  findById(id: string): Promise<Watchlist | null>;
  findByUser(userId: string): Promise<WatchlistWithCount[]>;
  delete(id: string): Promise<void>;
  countByUser(userId: string): Promise<number>;
  nameExists(userId: string, name: string, excludeId?: string): Promise<boolean>;

  // Items
  listItems(watchlistId: string): Promise<WatchlistItemRecord[]>;
  itemExists(watchlistId: string, instrumentId: string): Promise<boolean>;
  countItems(watchlistId: string): Promise<number>;
  addItem(watchlistId: string, instrumentId: string, note: string | null): Promise<void>;
  removeItem(watchlistId: string, instrumentId: string): Promise<void>;
  reorderItems(watchlistId: string, orderedInstrumentIds: string[]): Promise<void>;
}
