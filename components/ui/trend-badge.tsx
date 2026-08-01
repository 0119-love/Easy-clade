import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Period-over-period change indicator. `null` means there was no prior-period
 * activity to compare against (a brand new provider, or one you haven't used
 * yet this period), not a 0% change -- those are different things and
 * shouldn't look the same.
 */
interface TrendBadgeProps {
  changePct: number | null;
  /** Flips which direction reads as "good" -- e.g. success rate (up = good) or response time (down = good), vs. the default (up = spending more = bad). */
  invert?: boolean;
}

export function TrendBadge({ changePct, invert = false }: TrendBadgeProps) {
  if (changePct === null) {
    return (
      <span className="flex items-center gap-1 text-xs text-text-secondary">
        <Minus className="size-3" /> 이전 기록 없음
      </span>
    );
  }
  const rounded = Math.round(changePct);
  if (rounded === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-text-secondary">
        <Minus className="size-3" /> 변동 없음
      </span>
    );
  }
  const isUp = rounded > 0;
  const isGood = invert ? isUp : !isUp;
  return (
    <span className={cn("flex items-center gap-1 text-xs", isGood ? "text-success" : "text-danger")}>
      {isUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(rounded)}%
    </span>
  );
}
