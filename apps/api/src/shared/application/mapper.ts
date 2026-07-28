/**
 * A mapper translates between the three representations of an aggregate:
 *  - the domain entity,
 *  - its persistence shape (Prisma row),
 *  - and its DTO (transport / API response).
 * Concrete mappers implement the subset they need.
 */
export interface Mapper<TDomain, TPersistence, TDto> {
  toDomain(raw: TPersistence): TDomain;
  toPersistence(entity: TDomain): TPersistence;
  toDto(entity: TDomain): TDto;
}
