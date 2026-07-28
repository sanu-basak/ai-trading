import type { Router } from 'express';
import type { AppContainer } from '../di';
import { registerAuthModule } from './auth';
import { registerUsersModule } from './users';
import { registerInstrumentsModule } from './instruments';
import { registerMarketDataModule } from './market-data';
import { registerWatchlistModule } from './watchlist';
import { registerPortfolioModule } from './portfolio';
import { registerPaperTradingModule } from './paper-trading';
import { registerAiAnalysisModule } from './ai-analysis';

export interface MountedModule {
  path: string;
  router: Router;
}

/**
 * Registers every feature module's CQRS handlers and returns its router mounted
 * at the given path. Called once during app construction. New modules are added
 * here as the platform grows (each is an isolated bounded context).
 */
export function registerModules(container: AppContainer): MountedModule[] {
  return [
    { path: '/auth', router: registerAuthModule(container) },
    { path: '/users', router: registerUsersModule(container) },
    { path: '/instruments', router: registerInstrumentsModule(container) },
    { path: '/market', router: registerMarketDataModule(container) },
    { path: '/watchlists', router: registerWatchlistModule(container) },
    { path: '/portfolios', router: registerPortfolioModule(container) },
    { path: '/paper', router: registerPaperTradingModule(container) },
    { path: '/ai', router: registerAiAnalysisModule(container) },
  ];
}
