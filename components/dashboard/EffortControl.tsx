"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { EffortLevel } from "@/lib/store/dashboardStore";
import { EFFORT_LABELS as LABELS } from "@/lib/i18n/labels";
import { GLASS_SPRING } from "@/components/ui/motion-presets";

const LEVELS: EffortLevel[] = ["low", "medium", "high", "xhigh", "max"];

interface EffortControlProps {
  value: EffortLevel;
  onChange: (value: EffortLevel) => void;
}

/**
 * Segmented pill (Design/Build/Ship reference, same sliding-indicator
 * mechanism as ThemeToggle) instead of the old fill-up-to-here meter bar --
 * this reads as "pick one of five levels" rather than "how full is the
 * tank", which is what the control actually means. Numerals stand in for
 * the (long, in Korean) level names since several cards render side by side
 * in a narrow column; the full name still shows in the header row and each
 * segment's aria-label/title.
 */
export function EffortControl({ value, onChange }: EffortControlProps) {
  const layoutId = useId();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>생각 강도</span>
        <span className="font-mono text-foreground">{LABELS[value]}</span>
      </div>
      <div className="neu-surface flex items-center gap-0.5 rounded-full p-1">
        {LEVELS.map((level, i) => {
          const isActive = level === value;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              aria-label={LABELS[level]}
              aria-pressed={isActive}
              title={LABELS[level]}
              className={cn(
                "relative flex-1 rounded-full py-1 text-center text-[11px] font-mono tabular-nums transition-colors duration-150",
                isActive ? "text-foreground" : "text-text-secondary hover:text-foreground",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={`effort-active-${layoutId}`}
                  className="neu-pressed absolute inset-0 rounded-full"
                  transition={GLASS_SPRING}
                />
              )}
              <span className="relative z-10">{i + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
