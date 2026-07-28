import type { SymbolRef, AssetClass as MdAssetClass } from '../../../market-data';

export interface ExchangeDto {
  id: string;
  code: string;
  name: string;
  country: string | null;
  currency: string;
  timezone: string;
}

export interface InstrumentDto {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  exchange: { code: string; name: string };
  currency: string;
  sector: string | null;
  industry: string | null;
  lotSize: number;
  tickSize: number;
  isTradable: boolean;
  isActive: boolean;
}

/** Builds a provider-agnostic SymbolRef from an instrument DTO. */
export function toSymbolRef(instrument: InstrumentDto): SymbolRef {
  return {
    symbol: instrument.symbol,
    exchange: instrument.exchange.code,
    assetClass: instrument.assetClass as MdAssetClass,
  };
}
