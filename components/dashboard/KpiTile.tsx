import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/ui/sparkline";
import { TrendBadge } from "@/components/ui/trend-badge";

interface KpiTileProps {
  label: string;
  value: string;
  changePct: number | null;
  /** Flips TrendBadge's up/down-is-good logic -- see components/ui/trend-badge.tsx. */
  invertTrend?: boolean;
  /** Omit rather than fabricate history when no per-bucket data exists for this metric. */
  sparklineData?: number[];
  isLoading?: boolean;
}

export function KpiTile({ label, value, changePct, invertTrend, sparklineData, isLoading }: KpiTileProps) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-text-secondary">{label}</div>
      {isLoading ? (
        <Skeleton className="h-6 w-16" />
      ) : (
        <div className="flex items-center gap-2">
          <div className="font-mono text-xl font-semibold text-foreground">{value}</div>
          <TrendBadge changePct={changePct} invert={invertTrend} />
        </div>
      )}
      {!isLoading && sparklineData && sparklineData.length > 1 && (
        <Sparkline data={sparklineData} color="var(--primary)" height={24} />
      )}
    </div>
  );
}
