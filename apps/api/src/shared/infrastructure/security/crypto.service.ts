import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import type { AppConfig } from '../config';

/**
 * Authenticated symmetric encryption (AES-256-GCM) for data-at-rest secrets
 * such as broker tokens and 2FA secrets. The 256-bit key is derived from
 * ENCRYPTION_KEY via scrypt so any sufficiently long key string is accepted.
 *
 * Output format (base64):  [12-byte IV][16-byte auth tag][ciphertext]
 */
export class CryptoService {
  private readonly key: Buffer;
  private readonly ivLength = 12;
  private readonly algorithm = 'aes-256-gcm';

  constructor(config: AppConfig) {
    this.key = scryptSync(config.env.ENCRYPTION_KEY, 'devquantic.static.salt.v1', 32);
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(payload: string): string {
    const data = Buffer.from(payload, 'base64');
    const iv = data.subarray(0, this.ivLength);
    const authTag = data.subarray(this.ivLength, this.ivLength + 16);
    const ciphertext = data.subarray(this.ivLength + 16);
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  /**
   * One-way SHA-256 digest (hex) for storing high-entropy tokens such as
   * refresh tokens and API keys — never store these reversibly.
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** A URL-safe random opaque token (base64url). */
  randomToken(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
  }

  /** Constant-time comparison for tokens / signatures. */
  safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  }
}
