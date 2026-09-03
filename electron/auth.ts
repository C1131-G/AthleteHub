import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

import { z } from "zod";

import type { DatabaseContext, OwnerAccountInput } from "./backend";

const scrypt = promisify(nodeScrypt);
const PASSWORD_KEY_LENGTH = 64;
const RECOVERY_LENGTH = 16;
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 60_000;
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 32;
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/i;
const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN_LENGTH)
  .max(USERNAME_MAX_LENGTH)
  .regex(USERNAME_PATTERN);
const credentialsSchema = z.object({
  password: z.string().min(8),
  username: usernameSchema,
});
const recoverySchema = z.object({
  newPassword: z.string().min(8),
  recoveryCode: z.string().min(16),
  username: usernameSchema,
});

export type AuthErrorCode =
  | "ALREADY_CONFIGURED"
  | "INVALID_CREDENTIALS"
  | "INVALID_RECOVERY_CODE"
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR";

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export interface AuthService {
  isAuthenticated: () => boolean;
  login: (input: unknown) => Promise<{ authenticated: true }>;
  logout: () => Promise<void>;
  recover: (
    input: unknown
  ) => Promise<{ authenticated: true; recoveryCode: string }>;
  requireSession: () => Promise<void>;
  setup: (input: unknown) => Promise<{ recoveryCode: string }>;
  status: () => Promise<{ authenticated: boolean; configured: boolean }>;
}

const validateCredentials = (username: string, password: string) => {
  if (!USERNAME_PATTERN.test(username.trim()) || password.length < 8) {
    throw new AuthError(
      "VALIDATION_ERROR",
      "A valid username and password are required."
    );
  }
};

const createRecoveryCode = () => {
  const bytes = randomBytes(RECOVERY_LENGTH);
  const characters = Array.from(
    bytes,
    (byte) => RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length]
  );
  return `${characters.slice(0, 4).join("")}-${characters.slice(4, 8).join("")}-${characters.slice(8, 12).join("")}-${characters.slice(12).join("")}`;
};

const ownedBytes = (input: Uint8Array): Uint8Array<ArrayBuffer> => {
  const output = new Uint8Array(new ArrayBuffer(input.byteLength));
  output.set(input);
  return output;
};

const derive = async (value: string, salt: Uint8Array) => {
  const result = await scrypt(value, salt, PASSWORD_KEY_LENGTH);
  if (!(result instanceof Uint8Array)) {
    throw new TypeError("Password derivation returned an invalid value.");
  }
  return ownedBytes(result);
};

const matches = (actual: Uint8Array, expected: Uint8Array) =>
  actual.length === expected.length && timingSafeEqual(actual, expected);

const normalizedUsername = (username: string) => username.trim().toLowerCase();

const ownerInput = async (
  username: string,
  password: string,
  recoveryCode: string
): Promise<OwnerAccountInput> => {
  const passwordSalt = ownedBytes(randomBytes(16));
  const recoverySalt = ownedBytes(randomBytes(16));
  const now = new Date();
  return {
    createdAt: now,
    id: randomBytes(16).toString("hex"),
    passwordHash: await derive(password, passwordSalt),
    passwordSalt,
    recoveryHash: await derive(
      recoveryCode.replaceAll("-", "").toUpperCase(),
      recoverySalt
    ),
    recoverySalt,
    updatedAt: now,
    username: normalizedUsername(username),
  };
};

export const createAuthService = (database: DatabaseContext): AuthService => {
  let authenticated = false;

  const getOwner = () => database.owner.get();

  const status = async () => ({
    authenticated,
    configured: Boolean(await getOwner()),
  });

  const setup = async (input: unknown) => {
    const parsed = credentialsSchema.safeParse(input);
    if (!parsed.success) {
      throw new AuthError(
        "VALIDATION_ERROR",
        "A valid username and password are required."
      );
    }
    const credentials = parsed.data;
    validateCredentials(credentials.username, credentials.password);
    const recoveryCode = createRecoveryCode();
    try {
      const ownerRecord = await ownerInput(
        credentials.username,
        credentials.password,
        recoveryCode
      );
      await database.runTransaction(async (transaction) => {
        if (await transaction.owner.get()) {
          throw new AuthError(
            "ALREADY_CONFIGURED",
            "This installation already has an owner."
          );
        }
        await transaction.owner.create(ownerRecord);
      });
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        "ALREADY_CONFIGURED",
        "This installation already has an owner."
      );
    }
    authenticated = true;
    return { recoveryCode };
  };

  const login = async (input: unknown) => {
    const parsed = credentialsSchema.safeParse(input);
    if (!parsed.success) {
      throw new AuthError(
        "VALIDATION_ERROR",
        "A valid username and password are required."
      );
    }
    const credentials = parsed.data;
    validateCredentials(credentials.username, credentials.password);
    const owner = await getOwner();
    if (!owner || owner.username !== normalizedUsername(credentials.username)) {
      throw new AuthError(
        "INVALID_CREDENTIALS",
        "The username or password is incorrect."
      );
    }
    if (owner.lockedUntil && owner.lockedUntil.getTime() > Date.now()) {
      throw new AuthError(
        "INVALID_CREDENTIALS",
        "Too many attempts. Try again shortly."
      );
    }
    const passwordHash = await derive(credentials.password, owner.passwordSalt);
    if (!matches(passwordHash, owner.passwordHash)) {
      const failedAttempts = owner.failedAttempts + 1;
      await database.owner.update({
        failedAttempts,
        lockedUntil:
          failedAttempts >= LOCKOUT_THRESHOLD
            ? new Date(Date.now() + LOCKOUT_DURATION_MS)
            : null,
        updatedAt: new Date(),
      });
      throw new AuthError(
        "INVALID_CREDENTIALS",
        "The username or password is incorrect."
      );
    }
    await database.owner.update({
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    });
    authenticated = true;
    return { authenticated: true as const };
  };

  const recover = async (input: unknown) => {
    const parsed = recoverySchema.safeParse(input);
    if (!parsed.success) {
      throw new AuthError(
        "VALIDATION_ERROR",
        "Valid recovery details are required."
      );
    }
    const recovery = parsed.data;
    validateCredentials(recovery.username, recovery.newPassword);
    const owner = await getOwner();
    if (!owner || owner.username !== normalizedUsername(recovery.username)) {
      throw new AuthError(
        "INVALID_RECOVERY_CODE",
        "The recovery details are incorrect."
      );
    }
    const recoveryHash = await derive(
      recovery.recoveryCode.replaceAll("-", "").toUpperCase(),
      owner.recoverySalt
    );
    if (!matches(recoveryHash, owner.recoveryHash)) {
      throw new AuthError(
        "INVALID_RECOVERY_CODE",
        "The recovery details are incorrect."
      );
    }
    const nextRecoveryCode = createRecoveryCode();
    const next = await ownerInput(
      owner.username,
      recovery.newPassword,
      nextRecoveryCode
    );
    await database.owner.update({
      failedAttempts: 0,
      lockedUntil: null,
      passwordHash: next.passwordHash,
      passwordSalt: next.passwordSalt,
      recoveryHash: next.recoveryHash,
      recoverySalt: next.recoverySalt,
      updatedAt: new Date(),
    });
    authenticated = true;
    return { authenticated: true as const, recoveryCode: nextRecoveryCode };
  };

  return {
    isAuthenticated: () => authenticated,
    login,
    logout: () => {
      authenticated = false;
      return Promise.resolve();
    },
    recover,
    requireSession: () => {
      if (!authenticated) {
        return Promise.reject(
          new AuthError("UNAUTHENTICATED", "Log in to continue.")
        );
      }
      return Promise.resolve();
    },
    setup,
    status,
  };
};
