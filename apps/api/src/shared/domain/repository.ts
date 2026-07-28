/** Sort direction for repository queries. */
export type SortDirection = 'asc' | 'desc';

/** Standard pagination request. */
export interface PageRequest {
  page: number; // 1-based
  pageSize: number;
  sortBy?: string;
  sortDir?: SortDirection;
}

/** Standard paginated result envelope. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function normalizePageRequest(req?: Partial<PageRequest>): PageRequest {
  const page = Math.max(1, Math.trunc(req?.page ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(req?.pageSize ?? DEFAULT_PAGE_SIZE)));
  return { page, pageSize, sortBy: req?.sortBy, sortDir: req?.sortDir ?? 'desc' };
}

export function buildPage<T>(items: T[], total: number, req: PageRequest): Page<T> {
  return {
    items,
    total,
    page: req.page,
    pageSize: req.pageSize,
    totalPages: Math.max(1, Math.ceil(total / req.pageSize)),
  };
}

/**
 * Base repository contract. Concrete repositories live in each module's
 * `infrastructure` layer and implement module-specific interfaces that extend
 * (or narrow) this one.
 */
export interface Repository<TAggregate, TId = string> {
  findById(id: TId): Promise<TAggregate | null>;
  save(aggregate: TAggregate): Promise<void>;
  delete(id: TId): Promise<void>;
  exists(id: TId): Promise<boolean>;
}
