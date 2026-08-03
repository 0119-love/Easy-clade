import { NextResponse, type NextRequest } from "next/server";
import { requireUserContext } from "@/lib/auth/session";
import { OWNER_USER_ID } from "@/lib/auth/owner";
import { getFounderFunnelStats, type FounderFunnelStats } from "@/lib/history/founderFunnel";

export const runtime = "nodejs";

export type { FounderFunnelStats };

/**
 * Owner-only -- every other signed-up user gets a plain 403, not just a UI
 * that hides the card. Project Leap's whole point was "stop guessing, look
 * at whether strangers actually came back," and that's the operator's own
 * business, not something to leak to any account that happens to be logged in.
 */
export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.id !== OWNER_USER_ID) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  return NextResponse.json(await getFounderFunnelStats(OWNER_USER_ID));
}
