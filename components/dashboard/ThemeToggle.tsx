"use client";

import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { GLASS_SPRING } from "@/components/ui/motion-presets";

const OPTIONS = [
  { value: "light", label: "라이트", icon: Sun },
  { value: "dark", label: "다크", icon: Moon },
  { value: "system", label: "시스템", icon: Monitor },
] as const;

/**
 * M3 "Segmented button" -- an outlined group where the selected segment
 * gets a tonal (secondaryContainer) fill instead of the old neumorphic
 * emboss. Same sliding-pill mechanism as Sidebar's active-nav indicator
 * (framer-motion layoutId), just wearing Material colors now.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // `theme` is undefined on the server and on the client's first render
  // (matching each other, so no hydration mismatch) -- next-themes' own
  // internal effect resolves it from localStorage right after mount and
  // triggers a re-render through this same hook, so there's no need for a
  // second "have we mounted yet" effect/state pair here.
  const active = theme ?? "system";

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-input p-1">
      {OPTIONS.map((option) => {
        const isActive = active === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-pressed={isActive}
            className={cn(
              "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150",
              isActive ? "text-secondary-foreground" : "text-text-secondary hover:text-foreground",
            )}
          >
            {isActive && (
              <motion.div
                layoutId="theme-toggle-active"
                className="absolute inset-0 rounded-full bg-secondary"
                transition={GLASS_SPRING}
              />
            )}
            <Icon className="relative z-10 size-3.5" strokeWidth={1.75} />
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
