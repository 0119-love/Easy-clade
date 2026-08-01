import { NextResponse, type NextRequest } from "next/server";
import { getActivityHeatmapDays, type DailyStat } from "@/lib/history/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export interface HeatmapResponse {
  days: DailyStat[];
}

// Separate from /api/analytics's 30-day-scoped `daily` field -- the heatmap
// wants ~182 days, a different lookback that shouldn't couple to the
// unrelated 30-day trend chart's existing contract.
export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({ days: await getActivityHeatmapDays(auth.id) });
}
