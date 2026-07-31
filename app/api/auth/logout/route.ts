import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { deleteSessionToken } from "@/lib/auth/queries";
import { SESSION_COOKIE, clearSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await deleteSessionToken(token);

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
