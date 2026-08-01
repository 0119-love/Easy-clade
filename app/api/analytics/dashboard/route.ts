import { NextResponse, type NextRequest } from "next/server";
import {
  getAvgDurationByProviderInRange,
  getAvgDurationInRange,
  getRecentRunsWithProject,
  getStatsByProviderInRange,
  getSuccessRateInRange,
  getTodayStatsByProvider,
  localMidnightIso,
  type RunStatus,
  type TodayStatsByProvider,
} from "@/lib/history/queries";
import { PROVIDER_IDS, type ProviderId } from "@/lib/config/types";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

const ACTIVITY_PREVIEW_LENGTH = 48;

export interface DashboardProviderStat {
  provider: ProviderId;
  todayTokens: number;
  todayRunCount: number;
  avgDurationMs: number | null;
}

export interface DashboardTotals {
  todayTokens: number;
  todayRunCount: number;
  /** null when there was no run yesterday to compare against -- not the same as a 0% change. */
  changePct: number | null;
  runCountChangePct: number | null;
  successRate: number | null;
  /** Percentage-point delta (95%->90% is "-5"), not a relative % change of the rate itself. */
  successRateChangePct: number | null;
  avgDurationMs: number | null;
  avgDurationChangePct: number | null;
}

export interface DashboardActivityItem {
  id: number;
  provider: ProviderId;
  status: RunStatus;
  userPromptPreview: string;
  projectName: string | null;
  startedAt: string;
}

function sumTokens(stats: TodayStatsByProvider[]): number {
  return stats.reduce((sum, s) => sum + s.tokens, 0);
}

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const todayStartIso = localMidnightIso();
  const nowIso = new Date().toISOString();
  const yesterdayStartIso = new Date(new Date(todayStartIso).getTime() - 86_400_000).toISOString();

  const [
    todayByProvider,
    yesterdayByProvider,
    recentRuns,
    todaySuccess,
    yesterdaySuccess,
    todayDuration,
    yesterdayDuration,
    todayDurationByProvider,
  ] = await Promise.all([
    getTodayStatsByProvider(auth.id, todayStartIso),
    getStatsByProviderInRange(auth.id, yesterdayStartIso, todayStartIso),
    getRecentRunsWithProject(auth.id, 8),
    getSuccessRateInRange(auth.id, todayStartIso, nowIso),
    getSuccessRateInRange(auth.id, yesterdayStartIso, todayStartIso),
    getAvgDurationInRange(auth.id, todayStartIso, nowIso),
    getAvgDurationInRange(auth.id, yesterdayStartIso, todayStartIso),
    getAvgDurationByProviderInRange(auth.id, todayStartIso, nowIso),
  ]);

  const byProvider: DashboardProviderStat[] = PROVIDER_IDS.map((provider) => {
    const found = todayByProvider.find((p) => p.provider === provider);
    const duration = todayDurationByProvider.find((p) => p.provider === provider);
    return {
      provider,
      todayTokens: found?.tokens ?? 0,
      todayRunCount: found?.runCount ?? 0,
      avgDurationMs: duration?.avgDurationMs ?? null,
    };
  });

  const todayTokens = sumTokens(todayByProvider);
  const yesterdayTokens = sumTokens(yesterdayByProvider);
  const todayRunCount = todayByProvider.reduce((sum, p) => sum + p.runCount, 0);
  const yesterdayRunCount = yesterdayByProvider.reduce((sum, p) => sum + p.runCount, 0);

  const totals: DashboardTotals = {
    todayTokens,
    todayRunCount,
    changePct: yesterdayTokens > 0 ? ((todayTokens - yesterdayTokens) / yesterdayTokens) * 100 : null,
    runCountChangePct: yesterdayRunCount > 0 ? ((todayRunCount - yesterdayRunCount) / yesterdayRunCount) * 100 : null,
    successRate: todaySuccess.successRate,
    successRateChangePct:
      todaySuccess.successRate !== null && yesterdaySuccess.successRate !== null
        ? (todaySuccess.successRate - yesterdaySuccess.successRate) * 100
        : null,
    avgDurationMs: todayDuration.avgDurationMs,
    avgDurationChangePct:
      todayDuration.avgDurationMs !== null && yesterdayDuration.avgDurationMs !== null && yesterdayDuration.avgDurationMs > 0
        ? ((todayDuration.avgDurationMs - yesterdayDuration.avgDurationMs) / yesterdayDuration.avgDurationMs) * 100
        : null,
  };

  const recentActivity: DashboardActivityItem[] = recentRuns.map((r) => ({
    id: r.id,
    provider: r.provider,
    status: r.status,
    userPromptPreview:
      r.userPrompt.length > ACTIVITY_PREVIEW_LENGTH ? `${r.userPrompt.slice(0, ACTIVITY_PREVIEW_LENGTH)}…` : r.userPrompt,
    projectName: r.projectName,
    startedAt: r.startedAt,
  }));

  return NextResponse.json({ byProvider, totals, recentActivity });
}
