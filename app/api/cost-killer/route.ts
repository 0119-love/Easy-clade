import { NextResponse, type NextRequest } from "next/server";
import { getCostKillerLeaderboard } from "@/lib/history/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ entries: await getCostKillerLeaderboard(auth.id) });
}
