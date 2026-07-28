import { Result } from './result';

export interface GuardArgument {
  argument: unknown;
  argumentName: string;
}

export type GuardArgumentCollection = GuardArgument[];

/**
 * Lightweight domain validation helpers that return {@link Result} instead of
 * throwing, so use-cases can compose invariant checks explicitly.
 */
export class Guard {
  static combine(guardResults: Result<unknown, string>[]): Result<void, string> {
    for (const result of guardResults) {
      if (result.isFailure) {
        return Result.fail<void, string>(result.getError());
      }
    }
    return Result.ok<void, string>();
  }

  static againstNullOrUndefined(argument: unknown, argumentName: string): Result<void, string> {
    if (argument === null || argument === undefined) {
      return Result.fail<void, string>(`${argumentName} is null or undefined`);
    }
    return Result.ok<void, string>();
  }

  static againstNullOrUndefinedBulk(args: GuardArgumentCollection): Result<void, string> {
    for (const arg of args) {
      const result = this.againstNullOrUndefined(arg.argument, arg.argumentName);
      if (result.isFailure) {
        return result;
      }
    }
    return Result.ok<void, string>();
  }

  static againstEmpty(argument: string, argumentName: string): Result<void, string> {
    if (!argument || argument.trim().length === 0) {
      return Result.fail<void, string>(`${argumentName} must not be empty`);
    }
    return Result.ok<void, string>();
  }

  static inRange(
    num: number,
    min: number,
    max: number,
    argumentName: string,
  ): Result<void, string> {
    if (num < min || num > max) {
      return Result.fail<void, string>(`${argumentName} must be between ${min} and ${max}`);
    }
    return Result.ok<void, string>();
  }

  static isOneOf(value: unknown, validValues: unknown[], argumentName: string): Result<void, string> {
    if (!validValues.includes(value)) {
      return Result.fail<void, string>(
        `${argumentName} must be one of: ${validValues.join(', ')}`,
      );
    }
    return Result.ok<void, string>();
  }
}
