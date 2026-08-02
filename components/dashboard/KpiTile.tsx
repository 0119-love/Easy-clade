import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/ui/sparkline";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { TrendBadge } from "@/components/ui/trend-badge";
import { cn } from "@/lib/utils";

interface KpiTileProps {
  icon: LucideIcon;
  /** Tint classes for the icon's chip, e.g. "bg-violet-500/15 text-violet-400". */
  iconClassName: string;
  label: string;
  value: string;
  /** Short unit under the value, e.g. "토큰", "회", "개". */
  unit?: string;
  changePct: number | null;
  /** Flips TrendBadge's up/down-is-good logic -- see components/ui/trend-badge.tsx. */
  invertTrend?: boolean;
  /** Omit rather than fabricate history when no per-bucket data exists for this metric. */
  sparklineData?: number[];
  /** 0-100. For ratio/count metrics with no meaningful history (e.g. providers configured) -- takes priority over sparklineData. */
  progressPct?: number;
  isLoading?: boolean;
}

export function KpiTile({
  icon: Icon,
  iconClassName,
  label,
  value,
  unit,
  changePct,
  invertTrend,
  sparklineData,
  progressPct,
  isLoading,
}: KpiTileProps) {
  return (
    <div className="min-w-0 space-y-3 rounded-lg border border-border/60 p-4">
      <div className="flex items-center gap-2.5">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", iconClassName)}>
          <Icon className="size-4.5" />
        </div>
        <span className="truncate text-xs text-text-secondary">{label}</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <div className="space-y-0.5">
          <div className="font-mono text-2xl font-semibold tabular-nums text-foreground">{value}</div>
          {unit && <div className="text-xs text-text-secondary">{unit}</div>}
        </div>
      )}

      {!isLoading &&
        (progressPct !== undefined ? (
          <Progress value={progressPct} className="gap-0">
            <ProgressTrack className="h-1.5">
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
        ) : (
          sparklineData &&
          sparklineData.length > 1 && <Sparkline data={sparklineData} color="var(--primary)" height={24} />
        ))}

      {!isLoading && <TrendBadge changePct={changePct} invert={invertTrend} />}
    </div>
  );
}
