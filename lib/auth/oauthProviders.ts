import { randomBytes } from "node:crypto";

/**
 * Google/GitHub "Sign in with" -- standard server-side authorization-code
 * flow (client_secret on the server, no PKCE needed since this is a
 * confidential client). Hand-rolled with plain fetch, same style as
 * lib/auth/anthropicOAuth.ts, rather than pulling in a library for two
 * well-documented, publicly specified providers.
 */

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set -- required for this login provider.`);
  }
  return value;
}

export function generateOAuthState(): string {
  return randomBytes(16).toString("base64url");
}

export interface OAuthIdentity {
  providerUserId: string;
  email: string;
}

// ---------- Google ----------

export function getGoogleAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: requiredEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
}

interface GoogleUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<OAuthIdentity> {
  const clientId = requiredEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requiredEnv("GOOGLE_CLIENT_SECRET");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Google 토큰 교환에 실패했습니다 (${tokenRes.status}): ${await tokenRes.text()}`);
  }
  const { access_token } = (await tokenRes.json()) as GoogleTokenResponse;

  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!userRes.ok) {
    throw new Error(`Google 사용자 정보 조회에 실패했습니다 (${userRes.status}).`);
  }
  const info = (await userRes.json()) as GoogleUserInfo;
  if (!info.email || !info.email_verified) {
    throw new Error("Google 계정에 인증된 이메일이 없습니다.");
  }
  return { providerUserId: info.sub, email: info.email };
}

// ---------- GitHub ----------

export function getGithubAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: requiredEnv("GITHUB_CLIENT_ID"),
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

interface GithubTokenResponse {
  access_token?: string;
  error?: string;
}

interface GithubUser {
  id: number;
  email: string | null;
}

interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export async function exchangeGithubCode(code: string, redirectUri: string): Promise<OAuthIdentity> {
  const clientId = requiredEnv("GITHUB_CLIENT_ID");
  const clientSecret = requiredEnv("GITHUB_CLIENT_SECRET");

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
  });
  if (!tokenRes.ok) {
    throw new Error(`GitHub 토큰 교환에 실패했습니다 (${tokenRes.status}): ${await tokenRes.text()}`);
  }
  const tokenBody = (await tokenRes.json()) as GithubTokenResponse;
  if (!tokenBody.access_token) {
    throw new Error(`GitHub 토큰 교환에 실패했습니다: ${tokenBody.error ?? "알 수 없는 오류"}`);
  }

  const authHeaders = {
    Authorization: `Bearer ${tokenBody.access_token}`,
    Accept: "application/vnd.github+json",
    // GitHub's API rejects requests with no User-Agent.
    "User-Agent": "ai-command-center",
  };

  const userRes = await fetch("https://api.github.com/user", { headers: authHeaders });
  if (!userRes.ok) {
    throw new Error(`GitHub 사용자 정보 조회에 실패했습니다 (${userRes.status}).`);
  }
  const user = (await userRes.json()) as GithubUser;

  let email = user.email;
  if (!email) {
    // Private-email accounts return null above even with the user:email
    // scope granted -- the verified address only shows up via this endpoint.
    const emailsRes = await fetch("https://api.github.com/user/emails", { headers: authHeaders });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as GithubEmail[];
      email = emails.find((e) => e.primary && e.verified)?.email ?? emails.find((e) => e.verified)?.email ?? null;
    }
  }
  if (!email) {
    throw new Error("GitHub 계정에 인증된 이메일이 없습니다.");
  }
  return { providerUserId: String(user.id), email };
}
