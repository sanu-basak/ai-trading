import type { Logger } from '../../infrastructure/logger';
import { InternalError } from '../../errors';
import type { IQuery, IQueryHandler, QueryClass } from './query';

/**
 * In-process query bus. Mirrors the command bus but for read-only intents.
 */
export class QueryBus {
  private readonly handlers = new Map<string, IQueryHandler<IQuery, unknown>>();

  constructor(private readonly logger: Logger) {}

  register<TQuery extends IQuery, TResult>(
    query: QueryClass<TQuery>,
    handler: IQueryHandler<TQuery, TResult>,
  ): void {
    const name = query.name;
    if (this.handlers.has(name)) {
      throw new InternalError(`A handler is already registered for query "${name}"`);
    }
    this.handlers.set(name, handler as IQueryHandler<IQuery, unknown>);
  }

  async execute<TResult>(query: IQuery): Promise<TResult> {
    const name = query.constructor.name;
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new InternalError(`No handler registered for query "${name}"`);
    }
    this.logger.debug({ query: name }, 'Dispatching query');
    return handler.execute(query) as Promise<TResult>;
  }

  has(query: QueryClass): boolean {
    return this.handlers.has(query.name);
  }
}
