"use client";

import { useQuery } from "@tanstack/react-query";
import { PROVIDER_IDS, PROVIDER_LABELS, type KeysStatusResponse } from "@/lib/config/types";
import type { CostKillerEntry, RunRow } from "@/lib/history/queries";
import { HISTORY_STATUS_LABELS, formatRelativeTimeKo } from "@/lib/i18n/labels";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProviderMark } from "@/components/ui/provider-mark";

interface HistoryResponse {
  runs: RunRow[];
  total: number;
  today: { tokens: number; costUsd: number };
}

async function fetchHistory(): Promise<HistoryResponse> {
  const res = await fetch("/api/history?limit=8");
  if (!res.ok) throw new Error("활동 내역을 불러오지 못했습니다.");
  return res.json();
}

async function fetchCostKiller(): Promise<{ entries: CostKillerEntry[] }> {
  const res = await fetch("/api/cost-killer");
  if (!res.ok) throw new Error("비용 절감 인사이트를 불러오지 못했습니다.");
  return res.json();
}

async function fetchKeysStatus(): Promise<KeysStatusResponse> {
  const res = await fetch("/api/settings/keys");
  if (!res.ok) throw new Error("키 상태를 불러오지 못했습니다.");
  return res.json();
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-medium text-text-secondary">{children}</h3>;
}

function RowSkeletons({ count }: { count: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

function LiveActivity({ runs, isLoading }: { runs: RunRow[]; isLoading: boolean }) {
  return (
    <div className="space-y-3">
      <SectionLabel>실시간 활동</SectionLabel>
      {isLoading ? (
        <RowSkeletons count={3} />
      ) : runs.length === 0 ? (
        <p className="text-xs text-text-secondary">아직 실행 기록이 없습니다.</p>
      ) : (
        <ul className="space-y-2.5">
          {runs.map((run) => (
            <li key={run.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 truncate text-foreground">
                <ProviderMark provider={run.provider} size="sm" />
                {PROVIDER_LABELS[run.provider]} · {run.model}
              </span>
              <span
                className={
                  run.status === "success"
                    ? "text-success"
                    : run.status === "error"
                      ? "text-danger"
                      : "text-text-secondary"
                }
              >
                {HISTORY_STATUS_LABELS[run.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SystemOverview({
  today,
  dailyBudget,
  isLoading,
}: {
  today: { tokens: number; costUsd: number };
  dailyBudget: KeysStatusResponse["dailyBudget"];
  isLoading: boolean;
}) {
  const tokenPct = dailyBudget.tokens ? Math.min(100, (today.tokens / dailyBudget.tokens) * 100) : null;

  return (
    <div className="space-y-3">
      <SectionLabel>시스템 개요</SectionLabel>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">오늘 토큰</span>
            <span className="font-mono text-foreground">
              <AnimatedNumber value={today.tokens} />
              {dailyBudget.tokens ? ` / ${dailyBudget.tokens.toLocaleString()}` : ""}
            </span>
          </div>
          {tokenPct !== null && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
              <div
                className="h-full bg-primary transition-[width] duration-500 ease-out"
                style={{ width: `${tokenPct}%` }}
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">오늘 비용</span>
            <span className="font-mono text-foreground">
              $<AnimatedNumber value={today.costUsd} format={(v) => v.toFixed(4)} />
              {dailyBudget.costUsd ? ` / $${dailyBudget.costUsd.toFixed(2)}` : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ApiHealth({ keysStatus, isLoading }: { keysStatus: KeysStatusResponse | undefined; isLoading: boolean }) {
  return (
    <div className="space-y-3">
      <SectionLabel>API 상태</SectionLabel>
      {isLoading || !keysStatus ? (
        <RowSkeletons count={3} />
      ) : (
        <ul className="space-y-2.5">
          {PROVIDER_IDS.map((id) => {
            const status = keysStatus.providers[id];
            const label = !status.configured
              ? "미등록"
              : status.lastCallStatus === "error"
                ? "마지막 호출 실패"
                : `마지막 호출: ${formatRelativeTimeKo(status.lastSuccessfulCallAt)}`;
            return (
              <li key={id} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-foreground">
                  <ProviderMark provider={id} size="sm" />
                  {PROVIDER_LABELS[id]}
                </span>
                {status.lastSuccessfulCallAt ? (
                  <Tooltip>
                    <TooltipTrigger render={<span className="text-text-secondary">{label}</span>} />
                    <TooltipContent>{new Date(status.lastSuccessfulCallAt).toLocaleString()}</TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-text-secondary">{label}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CostKiller({ entries, isLoading }: { entries: CostKillerEntry[]; isLoading: boolean }) {
  return (
    <div className="space-y-3">
      <Tooltip>
        <TooltipTrigger render={<SectionLabel>비용 절감 인사이트</SectionLabel>} />
        <TooltipContent>
          &ldquo;최선의 답변&rdquo; 모드로 비교했을 때 실제로 이긴 모델과 그 비용입니다. 다음 프롬프트에서도 이긴다는 보장은
          아니고, 지금까지의 실제 기록입니다.
        </TooltipContent>
      </Tooltip>
      {isLoading ? (
        <RowSkeletons count={2} />
      ) : entries.length === 0 ? (
        <p className="text-xs text-text-secondary">
          &ldquo;최선의 답변&rdquo; 모드로 3번 이상 비교하면 어떤 모델이 저렴하면서도 자주 이겼는지 보여드립니다.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {entries.slice(0, 3).map((entry) => (
            <li key={`${entry.provider}-${entry.model}`} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 truncate text-foreground">
                <ProviderMark provider={entry.provider} size="sm" />
                {entry.model}
              </span>
              <span className="text-text-secondary">
                {entry.timesWon}/{entry.timesCompeted}승 · ${entry.avgCostUsd.toFixed(4)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RightIntelligencePanel() {
  const { data: history, isPending: historyPending } = useQuery({
    queryKey: ["history", "recent"],
    queryFn: fetchHistory,
    refetchInterval: 5000,
  });
  const { data: keysStatus, isPending: keysPending } = useQuery({
    queryKey: ["settings", "keys"],
    queryFn: fetchKeysStatus,
  });
  const { data: costKiller, isPending: costKillerPending } = useQuery({
    queryKey: ["cost-killer"],
    queryFn: fetchCostKiller,
  });

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-8 overflow-y-auto border-l border-border px-6 py-8">
      <LiveActivity runs={history?.runs ?? []} isLoading={historyPending} />
      <SystemOverview
        today={history?.today ?? { tokens: 0, costUsd: 0 }}
        dailyBudget={keysStatus?.dailyBudget ?? { tokens: null, costUsd: null }}
        isLoading={historyPending || keysPending}
      />
      <CostKiller entries={costKiller?.entries ?? []} isLoading={costKillerPending} />
      <ApiHealth keysStatus={keysStatus} isLoading={keysPending} />
    </aside>
  );
}
