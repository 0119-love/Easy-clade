import { cn } from "@/lib/utils";

// "프롬프트 최적화" covers both the prompt_optimize AND initial_draft server
// stages (both are one-time pre-loop setup) -- and "실패 재시도" isn't a
// separate pipeline step so much as the retry/exclude behavior every other
// stage already has, only visually surfaced here when it actually fires.
export type PipelineSlot = "start" | "cross_review" | "self_reflect" | "judge" | "retry";

const ORDER: PipelineSlot[] = ["start", "cross_review", "self_reflect", "judge", "retry"];

const SLOT_LABELS: Record<PipelineSlot, string> = {
  start: "프롬프트 최적화",
  cross_review: "크로스 리뷰",
  self_reflect: "자기 성찰",
  judge: "컨센서스 도출",
  retry: "실패 재시도",
};

interface PipelineStagesProps {
  activeSlot: PipelineSlot | "idle" | "done";
  retrying: boolean;
}

export function PipelineStages({ activeSlot, retrying }: PipelineStagesProps) {
  const activeIndex = activeSlot === "idle" ? -1 : activeSlot === "done" ? ORDER.length : ORDER.indexOf(activeSlot);

  return (
    <div className="grid grid-cols-5 gap-2">
      {ORDER.map((slot, i) => {
        const isRetrySlot = slot === "retry";
        const highlighted = isRetrySlot ? retrying : i === activeIndex;
        const done = !isRetrySlot && i < activeIndex;
        return (
          <div
            key={slot}
            className={cn(
              "rounded-lg border px-2 py-3 text-center text-xs font-medium transition-colors duration-150",
              highlighted
                ? "border-primary bg-[color-mix(in_oklch,var(--primary),transparent_90%)] text-foreground"
                : done
                  ? "border-border text-text-secondary"
                  : "border-border text-muted-foreground",
            )}
          >
            {SLOT_LABELS[slot]}
          </div>
        );
      })}
    </div>
  );
}
