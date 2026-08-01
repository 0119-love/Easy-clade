import { NextResponse, type NextRequest } from "next/server";
import { exchangeGoogleCode } from "@/lib/auth/oauthProviders";
import { createSessionToken, resolveOAuthUser } from "@/lib/auth/queries";
import { attachSessionCookie } from "@/lib/auth/session";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/auth/rateLimit";

export const runtime = "nodejs";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 35;

export async function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.nextUrl.origin);

  const ip = getClientIp(request);
  if (!checkRateLimit(`oauth:ip:${ip}`, MAX_ATTEMPTS, WINDOW_MS)) {
    loginUrl.searchParams.set("error", RATE_LIMIT_MESSAGE);
    return NextResponse.redirect(loginUrl);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieValue = request.cookies.get("oauth_state_google")?.value;
  const [savedState, next] = cookieValue?.split(":") ?? [];

  if (!code || !state || !savedState || state !== savedState) {
    loginUrl.searchParams.set("error", "로그인 요청이 만료되었거나 올바르지 않습니다. 다시 시도해주세요.");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("oauth_state_google");
    return response;
  }

  try {
    const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;
    const identity = await exchangeGoogleCode(code, redirectUri);
    const user = await resolveOAuthUser("google", identity);
    const { token, expiresAt } = await createSessionToken(user.id, false);

    const targetUrl = new URL(next || "/app", request.nextUrl.origin);
    const response = NextResponse.redirect(targetUrl);
    response.cookies.delete("oauth_state_google");
    attachSessionCookie(response, token, expiresAt);
    return response;
  } catch (err) {
    console.error("[auth/google/callback]", err);
    loginUrl.searchParams.set("error", err instanceof Error ? err.message : "Google 로그인에 실패했습니다.");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("oauth_state_google");
    return response;
  }
}
