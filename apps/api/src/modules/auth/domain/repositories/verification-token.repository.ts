export type VerificationTokenType =
  | 'EMAIL_VERIFICATION'
  | 'PASSWORD_RESET'
  | 'EMAIL_CHANGE'
  | 'MAGIC_LINK';

export interface VerificationTokenRecord {
  id: string;
  userId: string;
  type: VerificationTokenType;
  expiresAt: Date;
  usedAt: Date | null;
  payload: unknown | null;
}

export interface CreateVerificationTokenInput {
  userId: string;
  type: VerificationTokenType;
  tokenHash: string;
  expiresAt: Date;
  payload?: unknown;
}

export interface IVerificationTokenRepository {
  create(input: CreateVerificationTokenInput): Promise<void>;
  findValidByHash(
    tokenHash: string,
    type: VerificationTokenType,
  ): Promise<VerificationTokenRecord | null>;
  markUsed(id: string): Promise<void>;
  invalidateAllForUser(userId: string, type: VerificationTokenType): Promise<void>;
}
