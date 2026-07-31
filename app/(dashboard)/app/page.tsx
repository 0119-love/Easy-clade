"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { DashboardProviderCard } from "@/components/dashboard/DashboardProviderCard";
import { SystemStatusCard } from "@/components/dashboard/SystemStatusCard";
import { QuickActionsCard } from "@/components/dashboard/QuickActionsCard";
import { TokenTrendChart } from "@/components/dashboard/TokenTrendChart";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { DashboardFab } from "@/components/dashboard/DashboardFab";
import { useSystemStatus } from "@/lib/hooks/useSystemStatus";
import { PROVIDER_IDS } from "@/lib/config/types";
import type { ModelInfo } from "@/lib/providers/types";
import { fetchDashboardToday, fetchDashboardTrend } from "@/lib/analytics/client";
import type { DashboardRange } from "@/lib/history/queries";

const RANGE_LABELS: Record<DashboardRange, string> = {
  "24h": "24시간",
  "7d": "7일",
  "30d": "30일",
};

interface ModelsResponse {
  models: Record<string, ModelInfo[]>;
}

async function fetchModels(): Promise<ModelsResponse> {
  const res = await fetch("/api/models");
  if (!res.ok) throw new Error("모델 목록을 불러오지 못했습니다.");
  return res.json();
}

export default function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>("7d");
  const status = useSystemStatus();
  const { data: modelsData, isPending: modelsPending } = useQuery({ queryKey: ["models"], queryFn: fetchModels });
  const { data: today, isPending: todayPending } = useQuery({
    queryKey: ["dashboard", "today"],
    queryFn: fetchDashboardToday,
  });
  const { data: trend, isPending: trendPending } = useQuery({
    queryKey: ["dashboard", "trend", range],
    queryFn: () => fetchDashboardTrend(range),
  });

  const cardsLoading = todayPending || modelsPending || status.isPending;

  return (
    <div className="space-y-8 px-10 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">대시보드</h1>
          <p className="text-sm text-text-secondary">오늘의 사용량과 시스템 상태를 한눈에 확인하세요.</p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as DashboardRange)}>
          <TabsList>
            {(["24h", "7d", "30d"] as const).map((r) => (
              <TabsTrigger key={r} value={r}>
                {RANGE_LABELS[r]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

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
              sparklineData={sparklineData}
              isLoading={cardsLoading}
            />
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SystemStatusCard totals={today?.totals} activeAgentCount={today?.activeAgentCount} isLoading={todayPending} />
        <QuickActionsCard />
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">토큰 사용량 추이</h2>
        <TokenTrendChart points={trend?.points ?? []} isLoading={trendPending} />
      </Card>

      <RecentActivityCard items={today?.recentActivity} isLoading={todayPending} />

      <DashboardFab />
    </div>
  );
}
