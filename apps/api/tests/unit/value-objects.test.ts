import { describe, it, expect } from 'vitest';
import { Email } from '../../src/modules/auth/domain/value-objects/email.vo';
import { Password } from '../../src/modules/auth/domain/value-objects/password.vo';

describe('Email value object', () => {
  it('normalizes and accepts a valid email', () => {
    const r = Email.create('  User@Example.COM ');
    expect(r.isSuccess).toBe(true);
    expect(r.getValue().value).toBe('user@example.com');
  });

  it('rejects malformed emails', () => {
    for (const bad of ['', 'not-an-email', 'a@b', 'a@b.']) {
      expect(Email.create(bad).isFailure).toBe(true);
    }
  });
});

describe('Password value object', () => {
  it('accepts a policy-compliant password', () => {
    expect(Password.create('abcd1234').isSuccess).toBe(true);
  });

  it('rejects weak passwords', () => {
    expect(Password.create('short1').isFailure).toBe(true); // too short
    expect(Password.create('allletters').isFailure).toBe(true); // no digit
    expect(Password.create('12345678').isFailure).toBe(true); // no letter
  });
});
