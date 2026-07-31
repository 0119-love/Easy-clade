import crypto from "node:crypto";

/**
 * PKCE + token exchange for "connect with your Claude subscription" (the
 * flow Claude Code's `claude login` uses), driven by the Chrome extension.
 *
 * IMPORTANT -- this is NOT a publicly documented Anthropic OAuth API. Claude
 * Code's login talks to an internal client that Anthropic has never
 * published a client_id, authorize/token URL, or scope list for. Every value
 * below is read from environment variables with NO fallback baked in on
 * purpose: I don't have verified real values for Anthropic's side of this
 * flow, and hard-coding a guessed URL/client_id would look like working,
 * verified code while actually being fabricated. You (or whoever completes
 * Phase 0's verification pass) need to supply the real values here, e.g. by
 * inspecting Claude Code's own network traffic.
 *
 * Whatever you find, treat it as reverse-engineered and unsupported: it can
 * change or be blocked by Anthropic at any time, and reusing Claude Code's
 * own client outside the official app is very likely a Usage Policy /
 * Consumer Terms violation. See the Phase 0 note in the plan for the
 * BYOK fallback if this route turns out to be a dead end.
 */
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. This OAuth flow needs real Anthropic client/endpoint values that ` +
        `nobody at Anthropic has published -- see the comment at the top of lib/auth/anthropicOAuth.ts. ` +
        `Do not fill this in with a guess.`,
    );
  }
  return value;
}

export function getOAuthConfig() {
  return {
    clientId: requiredEnv("ANTHROPIC_OAUTH_CLIENT_ID"),
    authorizeUrl: requiredEnv("ANTHROPIC_OAUTH_AUTHORIZE_URL"),
    tokenUrl: requiredEnv("ANTHROPIC_OAUTH_TOKEN_URL"),
    // Space-separated, e.g. "org:create_api_key" or whatever Claude Code
    // actually requests -- also unverified, see module comment.
    scope: process.env.ANTHROPIC_OAUTH_SCOPE ?? "",
  };
}

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
}

/** Standard RFC 7636 PKCE pair -- this part is generic OAuth2, not Anthropic-specific. */
export function generatePkcePair(): PkcePair {
  const codeVerifier = crypto.randomBytes(48).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function generateState(): string {
  return crypto.randomBytes(16).toString("base64url");
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface ExchangedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function toExchangedTokens(body: TokenResponse): ExchangedTokens {
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    // Refresh 60s early so a request never starts on a token that expires mid-flight.
    expiresAt: Date.now() + Math.max(body.expires_in - 60, 0) * 1000,
  };
}

/** Exchanges the extension's authorization code for tokens. Public client -- no client_secret, PKCE only. */
export async function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<ExchangedTokens> {
  const { clientId, tokenUrl } = getOAuthConfig();
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: clientId,
      code_verifier: params.codeVerifier,
    }),
  });
  if (!res.ok) {
    throw new Error(`토큰 교환에 실패했습니다 (${res.status}): ${await res.text()}`);
  }
  return toExchangedTokens((await res.json()) as TokenResponse);
}

export async function refreshTokens(refreshToken: string): Promise<ExchangedTokens> {
  const { clientId, tokenUrl } = getOAuthConfig();
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });
  if (!res.ok) {
    throw new Error(`토큰 갱신에 실패했습니다 (${res.status}): ${await res.text()}`);
  }
  return toExchangedTokens((await res.json()) as TokenResponse);
}

/** Returns a still-valid access token, refreshing (and persisting) first if it's expired or about to be. */
export async function getValidAccessToken(
  current: { accessToken: string; refreshToken: string; expiresAt: number },
  onRefreshed: (tokens: ExchangedTokens) => void | Promise<void>,
): Promise<string> {
  if (Date.now() < current.expiresAt) return current.accessToken;
  const refreshed = await refreshTokens(current.refreshToken);
  await onRefreshed(refreshed);
  return refreshed.accessToken;
}
