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
import { registerAlertsModule, startAlertsWorkers } from './alerts';
import { registerTradeJournalModule } from './trade-journal';
import { registerRiskModule } from './risk';
import { registerSettingsModule } from './settings';
import { registerStrategyModule } from './strategy';
import { registerMarketScannerModule } from './market-scanner';
import { registerAdminModule } from './admin';
import { registerAiChatModule } from './ai-chat';
import { registerBillingModule } from './billing';
import { registerBrokerModule } from './broker';
import { registerNewsModule } from './news';

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
    { path: '/', router: registerAlertsModule(container) },
    { path: '/journal', router: registerTradeJournalModule(container) },
    { path: '/risk', router: registerRiskModule(container) },
    { path: '/settings', router: registerSettingsModule(container) },
    { path: '/strategies', router: registerStrategyModule(container) },
    { path: '/scanner', router: registerMarketScannerModule(container) },
    { path: '/admin', router: registerAdminModule(container) },
    { path: '/chat', router: registerAiChatModule(container) },
    { path: '/billing', router: registerBillingModule(container) },
    { path: '/broker', router: registerBrokerModule(container) },
    { path: '/news', router: registerNewsModule(container) },
  ];
}

/**
 * Starts background workers for modules that have them. Called from the server
 * bootstrap AFTER infrastructure (Redis) is connected — never during route
 * construction, since these touch the queue.
 */
export async function startModuleWorkers(container: AppContainer): Promise<void> {
  await startAlertsWorkers(container);
}
