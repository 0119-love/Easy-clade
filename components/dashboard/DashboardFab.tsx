"use client";

import { Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDashboardStore } from "@/lib/store/dashboardStore";

// bottom-24 (not bottom-5, like AmbientScenery's interval-picker chip) so the
// two floating elements never overlap.
export function DashboardFab() {
  const setCommandPaletteOpen = useDashboardStore((s) => s.setCommandPaletteOpen);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="명령어 팔레트 열기"
            className="glass fixed bottom-24 right-6 z-30 flex size-12 items-center justify-center rounded-full text-foreground shadow-[var(--elevation-2)] transition-[background-color,box-shadow] duration-150 hover:bg-[color-mix(in_oklch,var(--glass-bg),white_6%)] hover:shadow-[var(--elevation-3)]"
          >
            <Search className="size-5" strokeWidth={1.75} />
          </button>
        }
      />
      <TooltipContent>명령어 팔레트 (⌘K)</TooltipContent>
    </Tooltip>
  );
}
