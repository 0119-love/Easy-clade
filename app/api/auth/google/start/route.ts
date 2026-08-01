import { NextResponse, type NextRequest } from "next/server";
import { generateOAuthState, getGoogleAuthUrl } from "@/lib/auth/oauthProviders";
import { sanitizeNextPath } from "@/lib/auth/oauthState";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const state = generateOAuthState();
  const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
  const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;

  let authUrl: string;
  try {
    authUrl = getGoogleAuthUrl(state, redirectUri);
  } catch (err) {
    console.error("[auth/google/start]", err);
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("error", "Google 로그인이 아직 설정되지 않았습니다.");
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("oauth_state_google", `${state}:${next}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
