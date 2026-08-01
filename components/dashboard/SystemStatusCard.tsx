"use client";

import { Card } from "@/components/ui/card";
import { KpiTile } from "@/components/dashboard/KpiTile";
import { useSystemStatus } from "@/lib/hooks/useSystemStatus";
import { PROVIDER_IDS } from "@/lib/config/types";
import type { DashboardTotals } from "@/app/api/analytics/dashboard/route";
import { cn } from "@/lib/utils";

interface SystemStatusCardProps {
  totals: DashboardTotals | undefined;
  /** Total tokens per bucket, summed across providers -- reuses the trend fetch the page already makes for TokenTrendChart. The other 4 tiles have no per-bucket history, so they ship without a sparkline rather than fabricate one. */
  tokenSparkline?: number[];
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

export function SystemStatusCard({ totals, tokenSparkline, isLoading }: SystemStatusCardProps) {
  const status = useSystemStatus();
  const configuredCount = status.data ? Object.values(status.data.providers).filter((p) => p.configured).length : 0;

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">시스템 현황</h2>
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span className={cn("size-1.5 rounded-full", status.dotClass)} />
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiTile
          label="오늘 토큰"
          value={(totals?.todayTokens ?? 0).toLocaleString()}
          changePct={totals?.changePct ?? null}
          sparklineData={tokenSparkline}
          isLoading={isLoading}
        />
        <KpiTile
          label="오늘 API 호출"
          value={(totals?.todayRunCount ?? 0).toLocaleString()}
          changePct={totals?.runCountChangePct ?? null}
          isLoading={isLoading}
        />
        <KpiTile
          label="등록된 프로바이더"
          value={`${configuredCount} / ${PROVIDER_IDS.length}`}
          changePct={null}
          isLoading={status.isPending}
        />
        <KpiTile
          label="성공률"
          value={formatPercent(totals?.successRate ?? null)}
          changePct={totals?.successRateChangePct ?? null}
          invertTrend
          isLoading={isLoading}
        />
        <KpiTile
          label="평균 응답 시간"
          value={formatDurationShort(totals?.avgDurationMs ?? null)}
          changePct={totals?.avgDurationChangePct ?? null}
          invertTrend
          isLoading={isLoading}
        />
      </div>
    </Card>
  );
}
