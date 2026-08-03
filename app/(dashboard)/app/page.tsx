"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardProviderCard } from "@/components/dashboard/DashboardProviderCard";
import { SystemStatusCard } from "@/components/dashboard/SystemStatusCard";
import { FounderFunnelCard } from "@/components/dashboard/FounderFunnelCard";
import { TokenTrendChart } from "@/components/dashboard/TokenTrendChart";
import { CostBreakdownChart } from "@/components/dashboard/CostBreakdownChart";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { WeeklyInsightBanner } from "@/components/dashboard/WeeklyInsightBanner";
import { DashboardFab } from "@/components/dashboard/DashboardFab";
import { useSystemStatus } from "@/lib/hooks/useSystemStatus";
import { PROVIDER_IDS } from "@/lib/config/types";
import type { ModelInfo } from "@/lib/providers/types";
import type { DashboardRange } from "@/lib/history/queries";
import { fetchActivityHeatmap, fetchAnalytics, fetchDashboardToday, fetchDashboardTrend } from "@/lib/analytics/client";

interface ModelsResponse {
  models: Record<string, ModelInfo[]>;
}

async function fetchModels(): Promise<ModelsResponse> {
  const res = await fetch("/api/models");
  if (!res.ok) throw new Error("모델 목록을 불러오지 못했습니다.");
  return res.json();
}

export default function DashboardPage() {
  const status = useSystemStatus();
  const [trendRange, setTrendRange] = useState<DashboardRange>("daily");
  const { data: modelsData, isPending: modelsPending } = useQuery({ queryKey: ["models"], queryFn: fetchModels });
  const {
    data: today,
    isPending: todayPending,
    dataUpdatedAt: todayUpdatedAt,
  } = useQuery({
    queryKey: ["dashboard", "today"],
    queryFn: fetchDashboardToday,
    // System Status card polls this for live token/call/success-rate numbers
    // instead of only updating on a manual refresh or page reload.
    refetchInterval: 30_000,
  });
  const { data: trend, isPending: trendPending } = useQuery({
    queryKey: ["dashboard", "trend", trendRange],
    queryFn: () => fetchDashboardTrend(trendRange),
  });
  const { data: analytics, isPending: analyticsPending } = useQuery({ queryKey: ["analytics"], queryFn: fetchAnalytics });
  const { data: heatmap, isPending: heatmapPending } = useQuery({ queryKey: ["dashboard", "heatmap"], queryFn: fetchActivityHeatmap });

  const cardsLoading = todayPending || modelsPending || status.isPending;
  const tokenSparkline = (trend?.points ?? []).map((point) =>
    PROVIDER_IDS.reduce((sum, provider) => sum + point.values[provider], 0),
  );

  return (
    <div className="space-y-6 px-6 py-6">
      <DashboardHero />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {PROVIDER_IDS.map((provider) => {
          const stat = today?.byProvider.find((p) => p.provider === provider);
          const sparklineData = (trend?.points ?? []).map((point) => point.values[provider]);
          return (
            <DashboardProviderCard
              key={provider}
              provider={provider}
              modelCount={modelsData?.models[provider]?.length ?? 0}
              keyStatus={status.data?.providers[provider]}
              todayTokens={stat?.todayTokens ?? 0}
              todayRunCount={stat?.todayRunCount ?? 0}
              avgDurationMs={stat?.avgDurationMs ?? null}
              sparklineData={sparklineData}
              tokenLimit={status.data?.providerTokenLimits[provider]}
              isLoading={cardsLoading}
            />
          );
        })}
      </div>

      <SystemStatusCard
        totals={today?.totals}
        tokenSparkline={tokenSparkline}
        lastUpdatedAt={todayUpdatedAt}
        isLoading={todayPending}
      />

      <FounderFunnelCard />

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">토큰 사용량 추이</h2>
        <TokenTrendChart points={trend?.points ?? []} range={trendRange} onRangeChange={setTrendRange} isLoading={trendPending} />
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">프로바이더별 비용</h2>
        <CostBreakdownChart data={analytics?.providers ?? []} isLoading={analyticsPending} />
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">활동 히트맵</h2>
        <ActivityHeatmap data={heatmap?.days ?? []} isLoading={heatmapPending} />
      </Card>

      <RecentActivityCard items={today?.recentActivity} isLoading={todayPending} />

      <WeeklyInsightBanner />

      <DashboardFab />
    </div>
  );
}
