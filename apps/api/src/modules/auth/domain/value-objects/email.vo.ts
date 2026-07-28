import { Result, ValueObject } from '../../../../shared/domain';

interface EmailProps {
  value: string;
}

/** A validated, normalized (lower-cased, trimmed) email address. */
export class Email extends ValueObject<EmailProps> {
  private static readonly PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(props: EmailProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  static create(email: string): Result<Email, string> {
    if (!email || typeof email !== 'string') {
      return Result.fail('Email is required');
    }
    const normalized = email.trim().toLowerCase();
    if (normalized.length > 254 || !Email.PATTERN.test(normalized)) {
      return Result.fail('Invalid email address');
    }
    return Result.ok(new Email({ value: normalized }));
  }
}
