import { NextResponse, type NextRequest } from "next/server";
import { getUsageTrendByProvider, type DashboardRange } from "@/lib/history/queries";
import { PROVIDER_IDS, type ProviderId } from "@/lib/config/types";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

const RANGES: DashboardRange[] = ["24h", "7d", "30d"];

export interface DashboardTrendPoint {
  bucket: string;
  values: Record<ProviderId, number>;
}

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range");
  const range: DashboardRange = RANGES.includes(rangeParam as DashboardRange) ? (rangeParam as DashboardRange) : "7d";

  const rows = await getUsageTrendByProvider(auth.id, range);

  // Pivot (bucket, provider, tokens)[] into one row per bucket with every
  // provider present (0 when it had no runs in that bucket) -- the query only
  // returns rows for combinations that actually happened, but recharts needs
  // a fixed key set on every row.
  const buckets = Array.from(new Set(rows.map((r) => r.bucket))).sort();
  const points: DashboardTrendPoint[] = buckets.map((bucket) => {
    const values = Object.fromEntries(PROVIDER_IDS.map((id) => [id, 0])) as Record<ProviderId, number>;
    for (const row of rows) {
      if (row.bucket === bucket) values[row.provider] = row.tokens;
    }
    return { bucket, values };
  });

  return NextResponse.json({ range, points });
}
