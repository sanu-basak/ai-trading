import { hash, verify, type Options } from '@node-rs/argon2';

/**
 * Password hashing using Argon2id — the current OWASP-recommended algorithm.
 * Parameters are tuned for interactive logins; adjust with load testing.
 */
export class PasswordService {
  private readonly options: Options = {
    // Argon2id, ~19 MiB, 2 iterations, parallelism 1 — sensible server defaults.
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  };

  async hash(plain: string): Promise<string> {
    return hash(plain, this.options);
  }

  async verify(hashed: string, plain: string): Promise<boolean> {
    try {
      return await verify(hashed, plain, this.options);
    } catch {
      return false;
    }
  }
}
