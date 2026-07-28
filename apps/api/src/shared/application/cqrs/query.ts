/** Marker interface for queries (read-only intents). */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IQuery {}

/** Handles exactly one query type and returns its result. */
export interface IQueryHandler<TQuery extends IQuery, TResult> {
  execute(query: TQuery): Promise<TResult>;
}

/** Constructor type used as the registration key for a query. */
export type QueryClass<TQuery extends IQuery = IQuery> = new (...args: never[]) => TQuery;
