import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  /** 0-5, fractional values partially fill a star (e.g. 4.3). */
  value: number;
  className?: string;
}

export function StarRating({ value, className }: StarRatingProps) {
  const clamped = Math.max(0, Math.min(5, value));
  return (
    <div className={cn("flex items-center gap-0.5", className)} role="img" aria-label={`5점 만점에 ${clamped.toFixed(1)}점`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fillPct = Math.round(Math.max(0, Math.min(1, clamped - i)) * 100);
        return (
          <span key={i} className="relative inline-block size-4 shrink-0">
            <Star className="absolute inset-0 size-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPct}%` }}>
              <Star className="size-4 fill-warning text-warning" strokeWidth={1.75} />
            </span>
          </span>
        );
      })}
    </div>
  );
}
