import { randomBytes, randomInt, createHash } from "node:crypto";
import { execute, queryAll, queryOne } from "../history/db";

export interface UserRow {
  id: number;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: string;
}

function toUser(row: Record<string, unknown>): UserRow {
  return {
    id: row.id as number,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    emailVerified: Boolean(row.email_verified),
    createdAt: row.created_at as string,
  };
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const row = await queryOne("SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]);
  return row ? toUser(row) : null;
}

export async function findUserById(id: number): Promise<UserRow | null> {
  const row = await queryOne("SELECT * FROM users WHERE id = ?", [id]);
  return row ? toUser(row) : null;
}

export async function createUser(email: string, passwordHash: string): Promise<UserRow> {
  const createdAt = new Date().toISOString();
  const normalizedEmail = email.trim().toLowerCase();
  const row = await queryOne<{ id: number }>(
    "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?) RETURNING id",
    [normalizedEmail, passwordHash, createdAt],
  );
  return {
    id: row!.id,
    email: normalizedEmail,
    passwordHash,
    emailVerified: false, // matches the users.email_verified column's default -- see lib/history/db.ts
    createdAt,
  };
}

export async function listUsers(): Promise<UserRow[]> {
  const rows = await queryAll("SELECT * FROM users");
  return rows.map(toUser);
}

const SESSION_TTL_MS = {
  short: 24 * 60 * 60 * 1000, // 1 day -- "stay logged in" unchecked
  remember: 30 * 24 * 60 * 60 * 1000, // 30 days -- "stay logged in" checked
} as const;

export async function createSessionToken(userId: number, remember: boolean): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + (remember ? SESSION_TTL_MS.remember : SESSION_TTL_MS.short));
  await execute("INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)", [
    token,
    userId,
    expiresAt.toISOString(),
    new Date().toISOString(),
  ]);
  return { token, expiresAt };
}

/** Returns the owning user, or null if the token doesn't exist or has expired (expired rows are lazily swept here). */
export async function findUserBySessionToken(token: string): Promise<UserRow | null> {
  const row = await queryOne(
    `SELECT users.* FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ? AND sessions.expires_at > ?`,
    [token, new Date().toISOString()],
  );
  return row ? toUser(row) : null;
}

export async function deleteSessionToken(token: string): Promise<void> {
  await execute("DELETE FROM sessions WHERE token = ?", [token]);
}

/** Called on password reset -- invalidates every other device/browser logged in as this user. */
export async function deleteAllSessionsForUser(userId: number): Promise<void> {
  await execute("DELETE FROM sessions WHERE user_id = ?", [userId]);
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

const RESET_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes -- short-lived, unlike the old emailed link
const RESET_CODE_LENGTH = 6;
const MAX_RESET_ATTEMPTS = 5;

/** Returns the raw 6-digit code -- only this call site ever sees it; the DB only stores its hash. */
export async function createPasswordResetCode(userId: number): Promise<{ code: string; expiresAt: Date }> {
  // Only one live code per user at a time -- requesting a new one retires any previous, unused code.
  await execute("UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL", [
    new Date().toISOString(),
    userId,
  ]);

  const code = String(randomInt(0, 10 ** RESET_CODE_LENGTH)).padStart(RESET_CODE_LENGTH, "0");
  const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);
  // token_hash is a legacy NOT NULL/PK column from the old link-based design;
  // it's never read anymore, so a random value just satisfies the constraint.
  await execute(
    `INSERT INTO password_reset_tokens (token_hash, user_id, code_hash, attempts, expires_at, used_at, created_at)
     VALUES (?, ?, ?, 0, ?, NULL, ?)`,
    [randomBytes(16).toString("hex"), userId, hashCode(code), expiresAt.toISOString(), new Date().toISOString()],
  );

  return { code, expiresAt };
}

export type ResetCodeResult = "ok" | "invalid" | "expired" | "too_many_attempts";

/** Validates a submitted code against the user's live (unused, unexpired) one, consuming it on success. */
export async function verifyAndConsumePasswordResetCode(userId: number, code: string): Promise<ResetCodeResult> {
  // token_hash is the table's actual primary key (see lib/history/db.ts) --
  // repurposed here as an opaque row id since it's no longer a real token.
  // No secondary sort key beyond created_at: retiring the previous code on
  // every create means at most one used_at-IS-NULL row can exist per user.
  const row = await queryOne<{ token_hash: string; code_hash: string; attempts: number }>(
    `SELECT token_hash, code_hash, attempts FROM password_reset_tokens
     WHERE user_id = ? AND used_at IS NULL AND expires_at > ?
     ORDER BY created_at DESC LIMIT 1`,
    [userId, new Date().toISOString()],
  );

  if (!row) return "expired";

  if (row.attempts >= MAX_RESET_ATTEMPTS) {
    await execute("UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ?", [
      new Date().toISOString(),
      row.token_hash,
    ]);
    return "too_many_attempts";
  }

  if (row.code_hash !== hashCode(code)) {
    await execute("UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE token_hash = ?", [row.token_hash]);
    return "invalid";
  }

  await execute("UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ?", [
    new Date().toISOString(),
    row.token_hash,
  ]);
  return "ok";
}

export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
}

const VERIFY_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes, same as password reset codes
const MAX_VERIFY_ATTEMPTS = 5;

/** Returns the raw 6-digit code -- only this call site ever sees it; the DB only stores its hash. Mirrors createPasswordResetCode above. */
export async function createEmailVerificationCode(userId: number): Promise<{ code: string; expiresAt: Date }> {
  // Only one live code per user at a time -- requesting a new one (signup, or a resend) retires any previous, unused code.
  await execute("UPDATE email_verification_codes SET used_at = ? WHERE user_id = ? AND used_at IS NULL", [
    new Date().toISOString(),
    userId,
  ]);

  const code = String(randomInt(0, 10 ** RESET_CODE_LENGTH)).padStart(RESET_CODE_LENGTH, "0");
  const expiresAt = new Date(Date.now() + VERIFY_CODE_TTL_MS);
  await execute(
    `INSERT INTO email_verification_codes (user_id, code_hash, attempts, expires_at, used_at, created_at)
     VALUES (?, ?, 0, ?, NULL, ?)`,
    [userId, hashCode(code), expiresAt.toISOString(), new Date().toISOString()],
  );

  return { code, expiresAt };
}

/** Validates a submitted code against the user's live (unused, unexpired) one, consuming it on success. */
export async function verifyAndConsumeEmailVerificationCode(userId: number, code: string): Promise<ResetCodeResult> {
  const row = await queryOne<{ id: number; code_hash: string; attempts: number }>(
    `SELECT id, code_hash, attempts FROM email_verification_codes
     WHERE user_id = ? AND used_at IS NULL AND expires_at > ?
     ORDER BY created_at DESC, id DESC LIMIT 1`,
    [userId, new Date().toISOString()],
  );

  if (!row) return "expired";

  if (row.attempts >= MAX_VERIFY_ATTEMPTS) {
    await execute("UPDATE email_verification_codes SET used_at = ? WHERE id = ?", [new Date().toISOString(), row.id]);
    return "too_many_attempts";
  }

  if (row.code_hash !== hashCode(code)) {
    await execute("UPDATE email_verification_codes SET attempts = attempts + 1 WHERE id = ?", [row.id]);
    return "invalid";
  }

  await execute("UPDATE email_verification_codes SET used_at = ? WHERE id = ?", [new Date().toISOString(), row.id]);
  return "ok";
}

export async function markEmailVerified(userId: number): Promise<void> {
  await execute("UPDATE users SET email_verified = 1 WHERE id = ?", [userId]);
}
