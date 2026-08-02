import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireUserContext } from "@/lib/auth/session";
import { updateUserDisplayName } from "@/lib/auth/queries";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ email: auth.email, displayName: auth.displayName });
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => null)) as { displayName?: string } | null;
  if (!body || typeof body.displayName !== "string") {
    return NextResponse.json({ error: "표시 이름이 필요합니다." }, { status: 400 });
  }

  // An empty string (after trim) clears the name back to null -- the UI
  // falls back to the email local-part in that case.
  const trimmed = body.displayName.trim().slice(0, 60) || null;
  await updateUserDisplayName(auth.id, trimmed);
  return NextResponse.json({ email: auth.email, displayName: trimmed });
}
