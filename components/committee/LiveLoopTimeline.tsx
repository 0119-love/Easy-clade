import { ProviderMark } from "@/components/ui/provider-mark";
import type { ProviderId } from "@/lib/config/types";
import { cn } from "@/lib/utils";
import type { CommitteeLoopUiState } from "@/lib/store/committeeStore";

interface LiveLoopTimelineProps {
  loops: CommitteeLoopUiState[];
  currentLoop: number;
  maxLoops: number;
  allProviders: ProviderId[];
}

export function LiveLoopTimeline({ loops, currentLoop, maxLoops, allProviders }: LiveLoopTimelineProps) {
  const slots = Array.from({ length: maxLoops }, (_, i) => i + 1);

  return (
    <div className="scroll-fade-x -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
      {slots.map((loopNumber) => {
        const loop = loops.find((l) => l.loopNumber === loopNumber);
        const isCurrent = loopNumber === currentLoop && !loop;
        const label = loop ? (loop.status === "success" ? "완료" : "오류") : isCurrent ? "진행 중" : "대기 중";
        return (
          <div
            key={loopNumber}
            className={cn(
              "flex w-40 shrink-0 flex-col gap-2 rounded-lg border p-3",
              loop?.status === "success"
                ? "border-[color-mix(in_oklch,var(--success),transparent_60%)]"
                : isCurrent
                  ? "border-primary"
                  : "border-border opacity-60",
            )}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Loop {loopNumber}</span>
              <span className="text-text-secondary">{label}</span>
            </div>
            <div className="font-mono text-sm text-foreground">{loop?.qualityScore ?? "--"}/100</div>
            <div className="flex flex-wrap gap-1">
              {allProviders.map((p) => (
                <ProviderMark key={p} provider={p} size="sm" className={cn(loop?.excludedProviders.includes(p) && "opacity-30")} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
