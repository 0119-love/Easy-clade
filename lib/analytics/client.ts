import type { DailyStat, DashboardRange, ModelBreakdown, ProviderBreakdown, UsageGranularity } from "@/lib/history/queries";
import type { ProviderTrend } from "@/app/api/analytics/route";
import type { DashboardActivityItem, DashboardProviderStat, DashboardTotals } from "@/app/api/analytics/dashboard/route";
import type { DashboardTrendPoint } from "@/app/api/analytics/dashboard/trend/route";
import type { HeatmapResponse } from "@/app/api/analytics/heatmap/route";
import type { FounderFunnelStats } from "@/app/api/analytics/funnel/route";
import type { WeeklyInsight } from "@/lib/history/queries";

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

export interface DashboardResponse {
  byProvider: DashboardProviderStat[];
  totals: DashboardTotals;
  recentActivity: DashboardActivityItem[];
}

export async function fetchDashboardToday(): Promise<DashboardResponse> {
  const res = await fetch("/api/analytics/dashboard");
  if (!res.ok) throw new Error("대시보드 데이터를 불러오지 못했습니다.");
  return res.json();
}

export interface DashboardTrendResponse {
  range: DashboardRange;
  points: DashboardTrendPoint[];
}

export async function fetchDashboardTrend(range: DashboardRange): Promise<DashboardTrendResponse> {
  const res = await fetch(`/api/analytics/dashboard/trend?range=${range}`);
  if (!res.ok) throw new Error("사용량 추이를 불러오지 못했습니다.");
  return res.json();
}

export async function fetchActivityHeatmap(): Promise<HeatmapResponse> {
  const res = await fetch("/api/analytics/heatmap");
  if (!res.ok) throw new Error("활동 히트맵 데이터를 불러오지 못했습니다.");
  return res.json();
}

export async function fetchWeeklyInsight(): Promise<WeeklyInsight> {
  const res = await fetch("/api/analytics/insight");
  if (!res.ok) throw new Error("주간 인사이트를 불러오지 못했습니다.");
  return res.json();
}

/** Returns null (not a thrown error) on a non-owner 403 -- most signed-in users are expected to get one, and that's not a failure worth a console error or a toast. */
export async function fetchFounderFunnel(): Promise<FounderFunnelStats | null> {
  const res = await fetch("/api/analytics/funnel");
  if (!res.ok) return null;
  return res.json();
}
