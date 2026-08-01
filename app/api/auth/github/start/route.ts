import { NextResponse, type NextRequest } from "next/server";
import { generateOAuthState, getGithubAuthUrl } from "@/lib/auth/oauthProviders";
import { sanitizeNextPath } from "@/lib/auth/oauthState";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const state = generateOAuthState();
  const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
  const redirectUri = `${request.nextUrl.origin}/api/auth/github/callback`;

  let authUrl: string;
  try {
    authUrl = getGithubAuthUrl(state, redirectUri);
  } catch (err) {
    console.error("[auth/github/start]", err);
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("error", "GitHub 로그인이 아직 설정되지 않았습니다.");
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("oauth_state_github", `${state}:${next}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
