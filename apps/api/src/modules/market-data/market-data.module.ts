import type { Router } from 'express';
import type { AppContainer } from '../../di';
import { BinanceProvider } from '../../market-data';
import { createInstrumentRepository } from '../instruments';
import { MarketDataController } from './interface/market-data.controller';
import { marketDataRoutes } from './interface/market-data.routes';

/**
 * Composition root for market data. Registers concrete providers into the
 * failover registry and applies per-provider rate limits, then mounts the
 * read endpoints. Binance is registered as a live, keyless crypto source;
 * keyed providers are added here as credentials become available.
 */
export function registerMarketDataModule(container: AppContainer): Router {
  const { logger, providerRegistry, marketDataService } = container.cradle;

  providerRegistry.register(new BinanceProvider(logger));
  // Binance public REST allows generous limits; stay well within them.
  marketDataService.setRateLimit('binance', { capacity: 20, refillPerSec: 10 });

  const instrumentRepo = createInstrumentRepository(container);
  const controller = new MarketDataController(marketDataService, instrumentRepo);
  return marketDataRoutes(container, controller);
}
