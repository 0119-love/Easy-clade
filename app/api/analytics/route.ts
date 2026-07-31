import { NextResponse, type NextRequest } from "next/server";
import { getDailyStats, getModelBreakdown, getProviderBreakdown, getProviderCostInRange } from "@/lib/history/queries";
import { PROVIDER_IDS, type ProviderId } from "@/lib/config/types";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

const DAY_MS = 86_400_000;

export interface ProviderTrend {
  provider: ProviderId;
  currentCostUsd: number;
  previousCostUsd: number;
  /** null when there's no prior-period spend to compare against (can't divide by zero meaningfully). */
  changePct: number | null;
}

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const now = Date.now();
  const currentStart = new Date(now - 30 * DAY_MS).toISOString();
  const previousStart = new Date(now - 60 * DAY_MS).toISOString();

  const current = await getProviderCostInRange(auth.id, currentStart, new Date(now).toISOString());
  const previous = await getProviderCostInRange(auth.id, previousStart, currentStart);

  const trend: ProviderTrend[] = PROVIDER_IDS.map((provider) => {
    const currentCostUsd = current.find((c) => c.provider === provider)?.costUsd ?? 0;
    const previousCostUsd = previous.find((c) => c.provider === provider)?.costUsd ?? 0;
    const changePct = previousCostUsd > 0 ? ((currentCostUsd - previousCostUsd) / previousCostUsd) * 100 : null;
    return { provider, currentCostUsd, previousCostUsd, changePct };
  });

  return NextResponse.json({
    daily: await getDailyStats(auth.id, 30),
    providers: await getProviderBreakdown(auth.id),
    models: await getModelBreakdown(auth.id),
    trend,
  });
}
