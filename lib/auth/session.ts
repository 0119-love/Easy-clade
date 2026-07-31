import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserBySessionToken, type UserRow } from "./queries";

export const SESSION_COOKIE = "session";

export function attachSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE);
}

/** Server Components / layouts (no NextRequest available there) -- reads via next/headers. */
export async function getSessionUser(): Promise<UserRow | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await findUserBySessionToken(token);
}

/**
 * Route Handlers: validates the session and returns the user, or a
 * ready-to-return 401 NextResponse on failure. Callers pass `auth.id`
 * explicitly into whatever query functions they call next -- an earlier
 * version primed an AsyncLocalStorage-based ambient user context instead,
 * but Next.js/Turbopack bundles route handlers and query modules
 * separately enough that the same `AsyncLocalStorage` instance wasn't
 * reliably shared between them, so `getCurrentUserId()` read an empty
 * store even immediately after this function set it. Explicit parameters
 * don't depend on module-instance identity.
 *
 * Async because findUserBySessionToken hits Postgres -- callers MUST
 * `await` this. A missing await here previously meant `user` held a pending
 * Promise (always truthy), so the "no session" check never fired and every
 * request would have silently passed as authenticated.
 */
export async function requireUserContext(request: NextRequest): Promise<UserRow | NextResponse> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await findUserBySessionToken(token) : null;
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  return user;
}
