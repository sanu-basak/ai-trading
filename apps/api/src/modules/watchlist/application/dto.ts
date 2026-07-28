import type { Watchlist } from '../domain/watchlist.entity';
import type { WatchlistItemRecord } from '../domain/watchlist.repository';

export interface WatchlistItemDto {
  id: string;
  instrumentId: string;
  symbol: string;
  name: string;
  assetClass: string;
  exchange: string;
  note: string | null;
  sortOrder: number;
}

export interface WatchlistDto {
  id: string;
  name: string;
  color: string | null;
  isDefault: boolean;
  sortOrder: number;
  itemCount: number;
  createdAt: string;
}

export interface WatchlistDetailDto extends WatchlistDto {
  items: WatchlistItemDto[];
}

export function toWatchlistDto(watchlist: Watchlist, itemCount: number): WatchlistDto {
  const p = watchlist.toPersistenceProps();
  return {
    id: watchlist.id.toString(),
    name: p.name,
    color: p.color,
    isDefault: p.isDefault,
    sortOrder: p.sortOrder,
    itemCount,
    createdAt: p.createdAt.toISOString(),
  };
}

export function toItemDto(record: WatchlistItemRecord): WatchlistItemDto {
  return {
    id: record.id,
    instrumentId: record.instrumentId,
    symbol: record.symbol,
    name: record.name,
    assetClass: record.assetClass,
    exchange: record.exchange,
    note: record.note,
    sortOrder: record.sortOrder,
  };
}
