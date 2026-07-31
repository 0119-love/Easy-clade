import type { DailyStat, ModelBreakdown, ProviderBreakdown, UsageGranularity } from "@/lib/history/queries";
import type { ProviderTrend } from "@/app/api/analytics/route";

export interface AnalyticsResponse {
  daily: DailyStat[];
  providers: ProviderBreakdown[];
  models: ModelBreakdown[];
  trend: ProviderTrend[];
}

export async function fetchAnalytics(): Promise<AnalyticsResponse> {
  const res = await fetch("/api/analytics");
  if (!res.ok) throw new Error("분석 데이터를 불러오지 못했습니다.");
  return res.json();
}

export interface UsageBucketsResponse {
  granularity: UsageGranularity;
  buckets: DailyStat[];
}

export async function fetchUsageBuckets(granularity: UsageGranularity): Promise<UsageBucketsResponse> {
  const res = await fetch(`/api/analytics/usage?granularity=${granularity}`);
  if (!res.ok) throw new Error("사용량 데이터를 불러오지 못했습니다.");
  return res.json();
}
