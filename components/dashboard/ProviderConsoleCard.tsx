"use client";

import { useState } from "react";
import { MessageSquare, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProviderMark } from "@/components/ui/provider-mark";
import { ProviderConfigureDrawer } from "@/components/dashboard/ProviderConfigureDrawer";
import { PROVIDER_LABELS, type ProviderId, type ProviderKeyStatus } from "@/lib/config/types";
import type { ModelInfo } from "@/lib/providers/types";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { formatRelativeTimeKo } from "@/lib/i18n/labels";

interface ProviderConsoleCardProps {
  provider: ProviderId;
  models: ModelInfo[];
  keyStatus: ProviderKeyStatus | undefined;
  todayTokens: number;
  avgLatencyMs: number | null;
  isLoading?: boolean;
}

function formatLatency(ms: number | null): string {
  if (ms === null) return "--";
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Compact provider tile for the run console -- deliberately minimal (logo,
 * model, status, today's usage, two actions) so six of these fit on screen
 * at once without scrolling. Everything else that used to live directly on
 * the card (temperature, reasoning level, advanced settings) now lives in
 * ProviderConfigureDrawer, reached via "설정".
 */
export function ProviderConsoleCard({ provider, models, keyStatus, todayTokens, avgLatencyMs, isLoading }: ProviderConsoleCardProps) {
  const card = useDashboardStore((s) => s.cards[provider]);
  const [configureOpen, setConfigureOpen] = useState(false);
  const configured = keyStatus?.configured ?? false;
  const modelLabel = models.find((m) => m.id === card.model)?.label ?? card.model;

  const statusDotClass = !configured
    ? "bg-muted-foreground"
    : keyStatus?.lastCallStatus === "error"
      ? "bg-danger"
      : "bg-success";

  const statusTooltip = !configured
    ? "API 키가 등록되지 않았습니다."
    : keyStatus?.lastCallStatus === "error"
      ? (keyStatus?.lastCallError ?? "마지막 호출이 실패했습니다.")
      : `마지막 성공: ${formatRelativeTimeKo(keyStatus?.lastSuccessfulCallAt)}`;

  function openChat() {
    document.getElementById(`response-${provider}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Card className="flex max-h-[220px] flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <ProviderMark provider={provider} size="sm" />
        <span className="truncate text-sm font-semibold text-foreground">{PROVIDER_LABELS[provider]}</span>
        <Tooltip>
          <TooltipTrigger render={<span className={`ml-auto size-1.5 shrink-0 rounded-full ${statusDotClass}`} />} />
          <TooltipContent>{statusTooltip}</TooltipContent>
        </Tooltip>
      </div>

      {isLoading ? <Skeleton className="h-4 w-28" /> : <span className="truncate text-xs text-text-secondary">{modelLabel}</span>}

      <div className="flex items-center gap-4 border-t border-border pt-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[11px] text-text-secondary">오늘 토큰</span>
          {isLoading ? (
            <Skeleton className="h-4 w-12" />
          ) : (
            <span className="truncate font-mono text-[13px] text-foreground">{todayTokens.toLocaleString()}</span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[11px] text-text-secondary">지연시간</span>
          {isLoading ? <Skeleton className="h-4 w-12" /> : <span className="font-mono text-[13px] text-foreground">{formatLatency(avgLatencyMs)}</span>}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" className="flex-1" onClick={openChat}>
          <MessageSquare className="size-3.5" /> 채팅 열기
        </Button>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => setConfigureOpen(true)} aria-label="설정">
                <Settings2 className="size-3.5" />
              </Button>
            }
          />
          <TooltipContent>설정</TooltipContent>
        </Tooltip>
      </div>

      <ProviderConfigureDrawer
        provider={provider}
        models={models}
        isLoading={isLoading}
        open={configureOpen}
        onOpenChange={setConfigureOpen}
      />
    </Card>
  );
}
