import { NextResponse, type NextRequest } from "next/server";
import { getWeeklyInsight } from "@/lib/history/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json(await getWeeklyInsight(auth.id));
}
