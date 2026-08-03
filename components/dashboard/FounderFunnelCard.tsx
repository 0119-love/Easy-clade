"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { fetchFounderFunnel } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

// Project Leap's own completion bar (see the plan): 5 strangers completing
// Committee once is the low bar, 2 of them coming back on their own is the
// mid bar. Hardcoded here rather than configurable -- these are this
// round's specific targets, not a general-purpose setting.
const COMPLETED_TARGET = 5;
const RETURNED_TARGET = 2;

function ProgressStep({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  const met = value >= target;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{label}</span>
        <span className={cn("font-mono tabular-nums", met ? "text-success" : "text-foreground")}>
          {value} / {target}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width]", met ? "bg-success" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Owner-only -- fetchFounderFunnel resolves to null (not an error) for anyone else, and this renders nothing in that case. */
export function FounderFunnelCard() {
  const { data, isPending } = useQuery({ queryKey: ["analytics", "funnel"], queryFn: fetchFounderFunnel, retry: false });

  if (!isPending && !data) return null;

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Project Leap 퍼널</h2>
        <span className="text-xs text-text-secondary">나만 보이는 카드</span>
      </div>

      {isPending || !data ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <div className="text-xs text-text-secondary">가입 (본인 제외)</div>
              <div className="font-mono text-xl font-semibold tabular-nums text-foreground">{data.signups}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-text-secondary">뭐라도 실행함</div>
              <div className="font-mono text-xl font-semibold tabular-nums text-foreground">{data.ranAnything}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-text-secondary">Committee 완주</div>
              <div className="font-mono text-xl font-semibold tabular-nums text-foreground">{data.completedCommittee}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-text-secondary">재방문</div>
              <div className="font-mono text-xl font-semibold tabular-nums text-foreground">{data.returned}</div>
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <ProgressStep label="낮은 바 -- Committee 완주" value={data.completedCommittee} target={COMPLETED_TARGET} />
            <ProgressStep label="중간 바 -- 재방문" value={data.returned} target={RETURNED_TARGET} />
          </div>
        </>
      )}
    </Card>
  );
}
