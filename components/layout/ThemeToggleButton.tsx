"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Compact single-button light/dark toggle for the top bar -- separate from
 * ThemeToggle.tsx (the 3-way light/dark/system segmented control already on
 * the Preferences page), which stays as the place to pick "system". This
 * one is just a quick binary switch, always reachable from anywhere.
 */
export function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme();
  // resolvedTheme is undefined until next-themes resolves it post-mount
  // (same as ThemeToggle.tsx's `theme ?? "system"` fallback) -- default to
  // this app's own configured default (see ThemeProvider.tsx) rather than
  // guessing.
  const isDark = (resolvedTheme ?? "dark") === "dark";
  const label = isDark ? "라이트 모드로 전환" : "다크 모드로 전환";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={label}
            className="flex size-8 items-center justify-center rounded-[10px] text-text-secondary transition-colors duration-150 hover:bg-secondary hover:text-foreground"
          >
            {isDark ? <Sun className="size-4" strokeWidth={1.75} /> : <Moon className="size-4" strokeWidth={1.75} />}
          </button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
