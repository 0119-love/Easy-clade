"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, Box, Clock, Gauge, Layers, RefreshCw, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiTile } from "@/components/dashboard/KpiTile";
import { useSystemStatus } from "@/lib/hooks/useSystemStatus";
import { PROVIDER_IDS } from "@/lib/config/types";
import { formatRelativeTimeKo } from "@/lib/i18n/labels";
import type { DashboardTotals } from "@/app/api/analytics/dashboard/route";
import { cn } from "@/lib/utils";

interface SystemStatusCardProps {
  totals: DashboardTotals | undefined;
  /** Total tokens per bucket, summed across providers -- reuses the trend fetch the page already makes for TokenTrendChart. The other 3 metric tiles have no per-bucket history, so they ship without a sparkline rather than fabricate one. */
  tokenSparkline?: number[];
  /** react-query's dataUpdatedAt for the `today` fetch -- when this card last reflected real data, not when the component last rendered. */
  lastUpdatedAt?: number;
  isLoading?: boolean;
}

function formatDurationShort(ms: number | null): string {
  if (ms === null) return "–";
  return `${(ms / 1000).toFixed(1)}초`;
}

function formatPercent(rate: number | null): string {
  if (rate === null) return "–";
  return `${Math.round(rate * 100)}%`;
}

export function SystemStatusCard({ totals, tokenSparkline, lastUpdatedAt, isLoading }: SystemStatusCardProps) {
  const status = useSystemStatus();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const configuredCount = status.data ? Object.values(status.data.providers).filter((p) => p.configured).length : 0;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["settings", "keys"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Card className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-foreground">
            <Activity className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">시스템 현황</h2>
            <p className="text-xs text-text-secondary">실시간 시스템 상태 및 사용 현황</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border/60 px-2.5 py-1 text-xs text-text-secondary">
            <span className={cn("size-1.5 rounded-full", status.dotClass)} />
            {status.label}
          </span>
          <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-text-secondary">
            마지막 업데이트: {formatRelativeTimeKo(lastUpdatedAt ? new Date(lastUpdatedAt).toISOString() : null)}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="새로고침"
            >
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <KpiTile
          icon={Layers}
          iconClassName="bg-violet-500/15 text-violet-400"
          label="오늘 토큰"
          value={(totals?.todayTokens ?? 0).toLocaleString()}
          unit="토큰"
          changePct={totals?.changePct ?? null}
          sparklineData={tokenSparkline}
          isLoading={isLoading}
        />
        <KpiTile
          icon={Zap}
          iconClassName="bg-emerald-500/15 text-emerald-400"
          label="오늘 API 호출"
          value={(totals?.todayRunCount ?? 0).toLocaleString()}
          unit="회"
          changePct={totals?.runCountChangePct ?? null}
          isLoading={isLoading}
        />
        <KpiTile
          icon={Box}
          iconClassName="bg-blue-500/15 text-blue-400"
          label="등록된 프로바이더"
          value={`${configuredCount} / ${PROVIDER_IDS.length}`}
          unit="개"
          changePct={null}
          progressPct={(configuredCount / PROVIDER_IDS.length) * 100}
          isLoading={status.isPending}
        />
        <KpiTile
          icon={Gauge}
          iconClassName="bg-emerald-500/15 text-emerald-400"
          label="성공률"
          value={formatPercent(totals?.successRate ?? null)}
          unit="성공"
          changePct={totals?.successRateChangePct ?? null}
          invertTrend
          isLoading={isLoading}
        />
        <KpiTile
          icon={Clock}
          iconClassName="bg-amber-500/15 text-amber-400"
          label="평균 응답 시간"
          value={formatDurationShort(totals?.avgDurationMs ?? null)}
          unit="평균"
          changePct={totals?.avgDurationChangePct ?? null}
          invertTrend
          isLoading={isLoading}
        />
      </div>
    </Card>
  );
}
