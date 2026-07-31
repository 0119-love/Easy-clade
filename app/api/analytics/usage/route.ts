import { NextResponse, type NextRequest } from "next/server";
import { getUsageBuckets, type UsageGranularity } from "@/lib/history/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

const GRANULARITIES: UsageGranularity[] = ["daily", "weekly", "monthly"];

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const granularityParam = searchParams.get("granularity");
  const granularity: UsageGranularity = GRANULARITIES.includes(granularityParam as UsageGranularity)
    ? (granularityParam as UsageGranularity)
    : "daily";

  return NextResponse.json({ granularity, buckets: await getUsageBuckets(auth.id, granularity) });
}
