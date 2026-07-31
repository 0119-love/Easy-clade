import { NextResponse, type NextRequest } from "next/server";
import {
  getRecentRunsWithProject,
  getStatsByProviderInRange,
  getTodayStatsByProvider,
  localMidnightIso,
  type RunStatus,
  type TodayStatsByProvider,
} from "@/lib/history/queries";
import { getAgentPresets } from "@/lib/agents/queries";
import { PROVIDER_IDS, type ProviderId } from "@/lib/config/types";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

const ACTIVITY_PREVIEW_LENGTH = 48;

export interface DashboardProviderStat {
  provider: ProviderId;
  todayTokens: number;
  todayRunCount: number;
}

export interface DashboardTotals {
  todayTokens: number;
  todayRunCount: number;
  /** null when there was no run yesterday to compare against -- not the same as a 0% change. */
  changePct: number | null;
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
  const yesterdayStartIso = new Date(new Date(todayStartIso).getTime() - 86_400_000).toISOString();

  const [todayByProvider, yesterdayByProvider, presets, recentRuns] = await Promise.all([
    getTodayStatsByProvider(auth.id, todayStartIso),
    getStatsByProviderInRange(auth.id, yesterdayStartIso, todayStartIso),
    getAgentPresets(auth.id),
    getRecentRunsWithProject(auth.id, 8),
  ]);

  const byProvider: DashboardProviderStat[] = PROVIDER_IDS.map((provider) => {
    const found = todayByProvider.find((p) => p.provider === provider);
    return { provider, todayTokens: found?.tokens ?? 0, todayRunCount: found?.runCount ?? 0 };
  });

  const todayTokens = sumTokens(todayByProvider);
  const yesterdayTokens = sumTokens(yesterdayByProvider);
  const totals: DashboardTotals = {
    todayTokens,
    todayRunCount: todayByProvider.reduce((sum, p) => sum + p.runCount, 0),
    changePct: yesterdayTokens > 0 ? ((todayTokens - yesterdayTokens) / yesterdayTokens) * 100 : null,
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

  return NextResponse.json({ byProvider, totals, activeAgentCount: presets.length, recentActivity });
}
