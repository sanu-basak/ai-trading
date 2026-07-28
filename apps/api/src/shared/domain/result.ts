/**
 * A functional result type used across domain and application layers to model
 * success/failure explicitly instead of throwing for expected outcomes.
 */
export class Result<T, E = Error> {
  public readonly isSuccess: boolean;
  private readonly _error?: E;
  private readonly _value?: T;

  private constructor(isSuccess: boolean, value?: T, error?: E) {
    if (isSuccess && error !== undefined) {
      throw new Error('A successful result cannot contain an error.');
    }
    if (!isSuccess && error === undefined) {
      throw new Error('A failing result must contain an error.');
    }
    this.isSuccess = isSuccess;
    this._value = value;
    this._error = error;
    Object.freeze(this);
  }

  get isFailure(): boolean {
    return !this.isSuccess;
  }

  /** Unwraps the value; throws if the result is a failure (programmer error). */
  getValue(): T {
    if (!this.isSuccess) {
      throw new Error('Cannot get the value of a failed result. Check isFailure first.');
    }
    return this._value as T;
  }

  /** Returns the error of a failed result. */
  getError(): E {
    return this._error as E;
  }

  static ok<U, E = Error>(value?: U): Result<U, E> {
    return new Result<U, E>(true, value);
  }

  static fail<U, E = Error>(error: E): Result<U, E> {
    return new Result<U, E>(false, undefined, error);
  }

  /** Returns the first failing result, or an ok result if all succeed. */
  static combine(results: Result<unknown, unknown>[]): Result<unknown, unknown> {
    for (const result of results) {
      if (result.isFailure) {
        return result;
      }
    }
    return Result.ok();
  }
}

/** Left/Right either type for use-case return signatures. */
export type Either<L, R> = Left<L, R> | Right<L, R>;

export class Left<L, R> {
  readonly value: L;
  constructor(value: L) {
    this.value = value;
  }
  isLeft(): this is Left<L, R> {
    return true;
  }
  isRight(): this is Right<L, R> {
    return false;
  }
}

export class Right<L, R> {
  readonly value: R;
  constructor(value: R) {
    this.value = value;
  }
  isLeft(): this is Left<L, R> {
    return false;
  }
  isRight(): this is Right<L, R> {
    return true;
  }
}

export const left = <L, R>(value: L): Either<L, R> => new Left(value);
export const right = <L, R>(value: R): Either<L, R> => new Right(value);
