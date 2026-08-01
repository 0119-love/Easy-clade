"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, CircleAlert, Loader2 } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { ProviderMark } from "@/components/ui/provider-mark";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { PROVIDER_LABELS, type ProviderId } from "@/lib/config/types";
import { COMMITTEE_STAGE_LABELS, COMMITTEE_STEP_STATUS_LABELS } from "@/lib/i18n/labels";
import type { CommitteeStage } from "@/lib/committee/types";
import { stageKey, type CommitteeLoopUiState, type StageCallUiState, type StepUiStatus } from "@/lib/store/committeeStore";
import { cn } from "@/lib/utils";

function ElapsedSeconds({ startedAtMs, live }: { startedAtMs: number | null; live: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live || startedAtMs === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live, startedAtMs]);
  if (startedAtMs === null) return null;
  const seconds = Math.max(0, Math.round(((live ? now : startedAtMs) - startedAtMs) / 1000));
  return <span className="font-mono text-[11px] text-text-secondary">{seconds}초</span>;
}

const STATUS_ICON: Record<StepUiStatus, typeof CheckCircle2> = {
  pending: Circle,
  running: Loader2,
  success: CheckCircle2,
  error: CircleAlert,
};

const STATUS_ICON_CLASS: Record<StepUiStatus, string> = {
  pending: "text-muted-foreground",
  running: "animate-spin text-text-secondary",
  success: "text-success",
  error: "text-danger",
};

interface LiveLoopInspectorProps {
  providers: ProviderId[];
  currentLoop: number;
  maxLoops: number;
  /** null while idle/between loops (e.g. waiting on the judge call, which has no per-provider row here). */
  activeStage: CommitteeStage | null;
  stageCalls: Record<string, StageCallUiState>;
  loops: CommitteeLoopUiState[];
}

export function LiveLoopInspector({ providers, currentLoop, maxLoops, activeStage, stageCalls, loops }: LiveLoopInspectorProps) {
  const progressPct = maxLoops > 0 ? Math.round((currentLoop / maxLoops) * 100) : 0;
  const latestScore = [...loops].reverse().find((l) => l.qualityScore !== null)?.qualityScore ?? null;
  const chartData = loops.map((l) => ({ loop: `루프 ${l.loopNumber}`, score: l.qualityScore ?? 0 }));

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Live Loop Inspector</h2>
        <span className="text-xs text-text-secondary">
          현재 루프: {currentLoop} / {maxLoops} · <span className="font-mono">{progressPct}%</span>
        </span>
      </div>

      <div className="space-y-2">
        {providers.map((provider) => {
          const call = activeStage ? stageCalls[stageKey(currentLoop, activeStage, provider)] : undefined;
          const status = call?.status ?? "pending";
          const Icon = STATUS_ICON[status];
          return (
            <div key={provider} className="flex items-center gap-3">
              <ProviderMark provider={provider} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-foreground">{PROVIDER_LABELS[provider]}</div>
                <div className="text-xs text-text-secondary">
                  {activeStage ? COMMITTEE_STAGE_LABELS[activeStage] : "대기 중"} · {COMMITTEE_STEP_STATUS_LABELS[status]}
                </div>
              </div>
              <ElapsedSeconds startedAtMs={call?.startedAtMs ?? null} live={status === "running"} />
              <Icon className={cn("size-4 shrink-0", STATUS_ICON_CLASS[status])} />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
        <div>
          <div className="text-xs text-text-secondary">현재 품질 점수</div>
          <div className="font-mono text-xl font-semibold text-foreground">{latestScore ?? "--"} / 100</div>
        </div>
        {chartData.length > 1 && (
          <div className="h-16 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <RechartsTooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="품질 점수"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
