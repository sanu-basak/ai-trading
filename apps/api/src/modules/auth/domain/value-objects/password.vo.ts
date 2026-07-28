import { Result, ValueObject } from '../../../../shared/domain';

interface PasswordProps {
  value: string;
}

/**
 * A plaintext password that has passed the platform password policy. It never
 * touches the database — it is hashed by the application layer before storage.
 */
export class Password extends ValueObject<PasswordProps> {
  static readonly MIN_LENGTH = 8;
  static readonly MAX_LENGTH = 128;

  private constructor(props: PasswordProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  static create(password: string): Result<Password, string> {
    if (!password || typeof password !== 'string') {
      return Result.fail('Password is required');
    }
    if (password.length < Password.MIN_LENGTH) {
      return Result.fail(`Password must be at least ${Password.MIN_LENGTH} characters`);
    }
    if (password.length > Password.MAX_LENGTH) {
      return Result.fail(`Password must be at most ${Password.MAX_LENGTH} characters`);
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return Result.fail('Password must contain both letters and numbers');
    }
    return Result.ok(new Password({ value: password }));
  }
}
