import { execute, queryAll, queryOne } from "../history/db";
import { decryptSecret, encryptSecret } from "./crypto";
import {
  PROVIDER_IDS,
  type DailyBudget,
  type KeysStatusResponse,
  type Preferences,
  type ProviderAuthType,
  type ProviderId,
  type ProviderKeyStatus,
  type ProviderTokenLimits,
} from "./types";

/** Bearer credentials from the Chrome extension's OAuth connect flow (see lib/auth/anthropicOAuth.ts). */
export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms; the SDK call site refreshes ahead of this, never after. */
  expiresAt: number;
}

interface StoredProviderEntry {
  authType: ProviderAuthType;
  apiKey: string | null;
  oauth: OAuthTokens | null;
  updatedAt: string | null;
  lastSuccessfulCallAt: string | null;
  lastCallStatus: "success" | "error" | null;
  lastCallError: string | null;
}

interface ConfigFile {
  version: 1;
  providers: Record<ProviderId, StoredProviderEntry>;
  dailyBudget: DailyBudget;
  providerTokenLimits: ProviderTokenLimits;
  preferences: Preferences;
}

function emptyProviderEntry(): StoredProviderEntry {
  return {
    authType: "api_key",
    apiKey: null,
    oauth: null,
    updatedAt: null,
    lastSuccessfulCallAt: null,
    lastCallStatus: null,
    lastCallError: null,
  };
}

function emptyPreferences(): Preferences {
  return {
    defaultTemperature: 1,
    defaultEffort: "medium",
    showThinkingByDefault: true,
    syncScrollDefault: true,
    activeProviders: [...PROVIDER_IDS],
    providersOnboarded: false,
  };
}

function emptyConfig(): ConfigFile {
  return {
    version: 1,
    // Derived from PROVIDER_IDS rather than listed by hand -- this used to
    // hardcode exactly the original 3 providers, which meant adding a new
    // one only worked because TS's Record<ProviderId, ...> forced a compile
    // error here as a reminder. Deriving it means one less place to forget.
    providers: Object.fromEntries(PROVIDER_IDS.map((id) => [id, emptyProviderEntry()])) as Record<
      ProviderId,
      StoredProviderEntry
    >,
    dailyBudget: { tokens: null, costUsd: null },
    providerTokenLimits: {},
    preferences: emptyPreferences(),
  };
}

/** Decrypts the secret fields of one stored provider entry -- the in-memory ConfigFile always holds plaintext; only the stored JSONB is encrypted (see writeConfig). */
function decryptEntry(entry: StoredProviderEntry): StoredProviderEntry {
  return {
    ...entry,
    apiKey: entry.apiKey ? decryptSecret(entry.apiKey) : null,
    oauth: entry.oauth
      ? { ...entry.oauth, accessToken: decryptSecret(entry.oauth.accessToken), refreshToken: decryptSecret(entry.oauth.refreshToken) }
      : null,
  };
}

/** Encrypts the secret fields of one provider entry for storage -- inverse of decryptEntry. */
function encryptEntry(entry: StoredProviderEntry): StoredProviderEntry {
  return {
    ...entry,
    apiKey: entry.apiKey ? encryptSecret(entry.apiKey) : null,
    oauth: entry.oauth
      ? { ...entry.oauth, accessToken: encryptSecret(entry.oauth.accessToken), refreshToken: encryptSecret(entry.oauth.refreshToken) }
      : null,
  };
}

/** Some drivers hand back a jsonb column already parsed, others as raw text -- accept either. */
function parseStoredConfig(raw: unknown): Partial<ConfigFile> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Partial<ConfigFile>;
    } catch {
      return {};
    }
  }
  return raw as Partial<ConfigFile>;
}

async function readConfig(userId: number): Promise<ConfigFile> {
  const row = await queryOne<{ config: unknown }>(`SELECT config FROM user_configs WHERE user_id = ?`, [userId]);
  const parsed = parseStoredConfig(row?.config);
  const base = emptyConfig();
  const providers = {} as Record<ProviderId, StoredProviderEntry>;
  for (const id of PROVIDER_IDS) {
    providers[id] = decryptEntry({ ...emptyProviderEntry(), ...parsed.providers?.[id] });
  }
  return {
    version: 1,
    providers,
    dailyBudget: parsed.dailyBudget ?? base.dailyBudget,
    providerTokenLimits: parsed.providerTokenLimits ?? base.providerTokenLimits,
    preferences: { ...base.preferences, ...parsed.preferences },
  };
}

/**
 * Replaces the old local-file atomic-write dance (backup + temp file +
 * rename + re-read verification) -- Postgres's own durability and the
 * UPSERT's atomicity make that unnecessary here. Provider secrets are
 * encrypted right before this hits the database; everything else in this
 * module (readConfig, the mutators below) works with plaintext.
 */
async function writeConfig(userId: number, config: ConfigFile): Promise<void> {
  const toStore: ConfigFile = {
    ...config,
    providers: Object.fromEntries(PROVIDER_IDS.map((id) => [id, encryptEntry(config.providers[id])])) as Record<
      ProviderId,
      StoredProviderEntry
    >,
  };
  await execute(
    `INSERT INTO user_configs (user_id, config, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET config = EXCLUDED.config, updated_at = EXCLUDED.updated_at`,
    [userId, JSON.stringify(toStore), new Date().toISOString()],
  );
}

function maskKey(apiKey: string): string {
  if (apiKey.length <= 10) return `${apiKey.slice(0, 2)}...`;
  return `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`;
}

/** Client-safe view: never includes a raw key or token. */
export async function getMaskedKeys(userId: number): Promise<KeysStatusResponse> {
  const config = await readConfig(userId);
  const providers = {} as Record<ProviderId, ProviderKeyStatus>;
  for (const id of PROVIDER_IDS) {
    const entry = config.providers[id];
    const configured = entry.authType === "oauth" ? !!entry.oauth : !!entry.apiKey;
    providers[id] = {
      configured,
      authType: entry.authType,
      maskedKey: entry.authType === "oauth" ? "Claude 구독 (확장 프로그램 연결됨)" : entry.apiKey ? maskKey(entry.apiKey) : null,
      updatedAt: entry.updatedAt,
      lastSuccessfulCallAt: entry.lastSuccessfulCallAt,
      lastCallStatus: entry.lastCallStatus,
      lastCallError: entry.lastCallError,
    };
  }
  return { providers, dailyBudget: config.dailyBudget, providerTokenLimits: config.providerTokenLimits };
}

/** Server-only: the raw key, read at call time by a provider implementation. Never return this from an API route. */
export async function getRawKey(userId: number, provider: ProviderId): Promise<string | null> {
  const config = await readConfig(userId);
  return config.providers[provider].apiKey;
}

/** Server-only: current OAuth tokens, if this provider was connected via the extension. Never return this from an API route. */
export async function getOAuthTokens(userId: number, provider: ProviderId): Promise<OAuthTokens | null> {
  const config = await readConfig(userId);
  const entry = config.providers[provider];
  return entry.authType === "oauth" ? entry.oauth : null;
}

export async function saveKey(userId: number, provider: ProviderId, apiKey: string): Promise<void> {
  const config = await readConfig(userId);
  config.providers[provider] = {
    ...config.providers[provider],
    authType: "api_key",
    apiKey: apiKey.trim(),
    oauth: null,
    updatedAt: new Date().toISOString(),
  };
  await writeConfig(userId, config);
}

/** Called by the OAuth callback route once the extension's auth code has been exchanged for tokens. */
export async function saveOAuthTokens(userId: number, provider: ProviderId, tokens: OAuthTokens): Promise<void> {
  const config = await readConfig(userId);
  config.providers[provider] = {
    ...config.providers[provider],
    authType: "oauth",
    apiKey: null,
    oauth: tokens,
    updatedAt: new Date().toISOString(),
  };
  await writeConfig(userId, config);
}

/** Called by the provider client right before a call, after refreshing an expiring access token. */
export async function updateOAuthAccessToken(userId: number, provider: ProviderId, accessToken: string, expiresAt: number): Promise<void> {
  const config = await readConfig(userId);
  const entry = config.providers[provider];
  if (entry.authType !== "oauth" || !entry.oauth) return;
  entry.oauth = { ...entry.oauth, accessToken, expiresAt };
  await writeConfig(userId, config);
}

export async function clearKey(userId: number, provider: ProviderId): Promise<void> {
  const config = await readConfig(userId);
  config.providers[provider] = emptyProviderEntry();
  await writeConfig(userId, config);
}

export async function recordCallResult(
  userId: number,
  provider: ProviderId,
  status: "success" | "error",
  errorMessage?: string,
): Promise<void> {
  const config = await readConfig(userId);
  const entry = config.providers[provider];
  entry.lastCallStatus = status;
  entry.lastCallError = status === "error" ? (errorMessage ?? "알 수 없는 오류") : null;
  if (status === "success") {
    entry.lastSuccessfulCallAt = new Date().toISOString();
  }
  await writeConfig(userId, config);
}

export async function saveDailyBudget(userId: number, budget: DailyBudget): Promise<void> {
  const config = await readConfig(userId);
  config.dailyBudget = budget;
  await writeConfig(userId, config);
}

/** tokens: null clears the limit for that provider. */
export async function saveProviderTokenLimit(userId: number, provider: ProviderId, tokens: number | null): Promise<void> {
  const config = await readConfig(userId);
  const next = { ...config.providerTokenLimits };
  if (tokens === null) {
    delete next[provider];
  } else {
    next[provider] = tokens;
  }
  config.providerTokenLimits = next;
  await writeConfig(userId, config);
}

export async function getPreferences(userId: number): Promise<Preferences> {
  return (await readConfig(userId)).preferences;
}

export async function savePreferences(userId: number, preferences: Preferences): Promise<void> {
  const config = await readConfig(userId);
  config.preferences = preferences;
  await writeConfig(userId, config);
}

/** Wipes provider keys, budget, and preferences back to first-run defaults. Does NOT touch the runs/tasks/etc. tables (see lib/resetAllData.ts for the full per-user data wipe). */
export async function resetConfig(userId: number): Promise<void> {
  await writeConfig(userId, emptyConfig());
}

/**
 * Cross-account lookup used only by the "API 키로 로그인" flow (app/api/auth/login-with-key),
 * which runs before any user is authenticated -- so unlike every other function
 * in this file, there's no userId to scope by yet. Scans every account's
 * config row and looks for an exact stored Anthropic key match.
 */
export async function findUserIdByAnthropicKey(apiKey: string): Promise<number | null> {
  const trimmed = apiKey.trim();
  const rows = await queryAll<{ user_id: number; config: unknown }>(`SELECT user_id, config FROM user_configs`);
  for (const row of rows) {
    const parsed = parseStoredConfig(row.config);
    const stored = parsed.providers?.anthropic?.apiKey;
    if (stored && decryptSecret(stored) === trimmed) return row.user_id;
  }
  return null;
}

/** Defense in depth: strip a known raw key/token value out of an error string before it's ever returned to the client. */
export async function sanitizeErrorMessage(userId: number, message: string, provider: ProviderId): Promise<string> {
  let sanitized = message;
  const rawKey = await getRawKey(userId, provider);
  if (rawKey) sanitized = sanitized.split(rawKey).join("[redacted]");
  const oauth = await getOAuthTokens(userId, provider);
  if (oauth) {
    sanitized = sanitized.split(oauth.accessToken).join("[redacted]").split(oauth.refreshToken).join("[redacted]");
  }
  return sanitized;
}
