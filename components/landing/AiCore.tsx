import { Sparkles } from "lucide-react";

/** Center of the orbit -- replaces the old portrait photo. Flat primary fill, no gradient, just a slow breathing pulse. */
export function AiCore() {
  return (
    <div className="ai-core-breathe relative z-10 flex size-28 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--elevation-2)]">
      <Sparkles className="size-10" strokeWidth={1.5} />
    </div>
  );
}
