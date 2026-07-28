import { bootstrap } from './http/server';

/**
 * Process entry point. Any failure during boot is fatal and exits non-zero so
 * the orchestrator restarts the container.
 */
bootstrap().catch((err: unknown) => {
  // The logger may not exist yet if config/env parsing failed — use stderr.
  // eslint-disable-next-line no-console
  console.error('Fatal: failed to start DEVQUANTIC API\n', err);
  process.exit(1);
});
