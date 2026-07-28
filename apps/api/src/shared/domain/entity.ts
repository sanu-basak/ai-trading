import { UniqueEntityID } from './identifier';

/**
 * Base class for domain entities. Identity equality is based on the entity id,
 * not on structural (attribute) equality.
 */
export abstract class Entity<Props> {
  protected readonly _id: UniqueEntityID;
  protected readonly props: Props;

  protected constructor(props: Props, id?: UniqueEntityID) {
    this._id = id ?? new UniqueEntityID();
    this.props = props;
  }

  get id(): UniqueEntityID {
    return this._id;
  }

  equals(object?: Entity<Props>): boolean {
    if (object === null || object === undefined) {
      return false;
    }
    if (this === object) {
      return true;
    }
    if (!(object instanceof Entity)) {
      return false;
    }
    return this._id.equals(object._id);
  }
}
