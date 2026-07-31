"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendBadge } from "@/components/ui/trend-badge";
import { useSystemStatus } from "@/lib/hooks/useSystemStatus";
import { PROVIDER_IDS } from "@/lib/config/types";
import type { DashboardTotals } from "@/app/api/analytics/dashboard/route";
import { cn } from "@/lib/utils";

interface SystemStatusCardProps {
  totals: DashboardTotals | undefined;
  activeAgentCount: number | undefined;
  isLoading?: boolean;
}

export function SystemStatusCard({ totals, activeAgentCount, isLoading }: SystemStatusCardProps) {
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-xs text-text-secondary">오늘 API 호출</div>
          {isLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <div className="font-mono text-xl font-semibold text-foreground">
              {(totals?.todayRunCount ?? 0).toLocaleString()}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <div className="text-xs text-text-secondary">오늘 토큰</div>
          {isLoading ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="font-mono text-xl font-semibold text-foreground">
                {(totals?.todayTokens ?? 0).toLocaleString()}
              </div>
              <TrendBadge changePct={totals?.changePct ?? null} />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <div className="text-xs text-text-secondary">활성 에이전트</div>
          {isLoading ? (
            <Skeleton className="h-6 w-10" />
          ) : (
            <div className="font-mono text-xl font-semibold text-foreground">{activeAgentCount ?? 0}</div>
          )}
        </div>
        <div className="space-y-1">
          <div className="text-xs text-text-secondary">등록된 프로바이더</div>
          {status.isPending ? (
            <Skeleton className="h-6 w-10" />
          ) : (
            <div className="font-mono text-xl font-semibold text-foreground">
              {configuredCount} / {PROVIDER_IDS.length}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
