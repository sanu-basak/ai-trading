import { createId, isCuid } from '@paralleldrive/cuid2';

/**
 * A collision-resistant, opaque identity for entities and aggregates.
 * Wraps a string id and generates one when not supplied.
 */
export class UniqueEntityID {
  private readonly value: string;

  constructor(id?: string) {
    this.value = id ?? createId();
  }

  toString(): string {
    return this.value;
  }

  toValue(): string {
    return this.value;
  }

  equals(id?: UniqueEntityID): boolean {
    if (id === undefined || id === null) {
      return false;
    }
    return id.toValue() === this.value;
  }

  static isValid(id: string): boolean {
    return isCuid(id);
  }
}
