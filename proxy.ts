import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

/**
 * Optimistic gate only (cookie presence, no DB hit) -- the Next.js auth guide
 * explicitly recommends this split: Proxy runs on every request including
 * prefetches, so it should stay cheap. The real (dashboard) layout re-checks
 * against the sessions table before rendering anything (see its getSessionUser()
 * call), which is what actually protects the data.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isLandingPage = pathname === "/";
  // "/" is public (reachable with no session) same as the auth pages, but
  // deliberately NOT in the "bounce away if a session cookie exists" branch
  // below like they are. This check is a presence check, not a validity
  // check (see the comment above) -- a stale or already-expired session
  // cookie left over in the browser used to make "/" redirect straight to
  // /app, which the real DB-backed check in (dashboard)/layout.tsx then
  // immediately bounced back out of to /login. Net effect from a visitor's
  // side: the landing page never showed, they just landed on /login. A
  // genuinely logged-in visitor seeing the pitch once more on "/" is a much
  // smaller cost than the landing page silently not working for anyone with
  // cookie debris.
  const isPublicPage = isLandingPage || isAuthPage;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!isPublicPage && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|backgrounds|favicon.ico).*)"],
};
