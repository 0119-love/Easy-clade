"use client";

import { useQuery } from "@tanstack/react-query";
import { PenSquare, Zap, Crown } from "lucide-react";
import { fetchBrainHistory, type BrainHistoryEntry } from "@/lib/brain/client";
import { formatRelativeTimeKo } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";

const PROMPT_PREVIEW_LENGTH = 40;

function previewOf(prompt: string): string {
  const firstLine = prompt.split("\n")[0].trim();
  return firstLine.length > PROMPT_PREVIEW_LENGTH ? `${firstLine.slice(0, PROMPT_PREVIEW_LENGTH)}...` : firstLine;
}

interface BrainHistorySidebarProps {
  selectedId: number | null;
  onSelect: (entry: BrainHistoryEntry) => void;
  onNew: () => void;
  /** Bumped by the parent right after a run finishes, so the fresh entry shows up without a manual refresh. */
  refreshKey: number;
}

export function BrainHistorySidebar({ selectedId, onSelect, onNew, refreshKey }: BrainHistorySidebarProps) {
  const { data, isPending } = useQuery({
    queryKey: ["brain", "history", refreshKey],
    queryFn: fetchBrainHistory,
  });

  const entries = data?.entries ?? [];

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-1 border-r border-border/60 pr-3">
      <button
        type="button"
        onClick={onNew}
        className="mb-2 flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-card"
      >
        <PenSquare className="size-3.5" />새 프롬프트
      </button>

      <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary/70">기록</div>

      {isPending ? (
        <div className="space-y-1.5 px-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="px-2 py-4 text-xs leading-relaxed text-text-secondary">
          아직 기록이 없어요. 프롬프트를 실행하면 여기에 남아요.
        </p>
      ) : (
        <div className="flex flex-col gap-0.5 overflow-y-auto">
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelect(entry)}
              className={cn(
                "flex flex-col gap-1 rounded-lg px-2.5 py-2 text-left transition-colors",
                selectedId === entry.id ? "bg-emerald-500/10 ring-1 ring-emerald-500/40" : "hover:bg-card/60",
              )}
            >
              <span className="truncate text-xs font-medium text-foreground">{previewOf(entry.userPrompt)}</span>
              <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                {entry.mode === "cost_saver" ? (
                  <Zap className="size-3 text-emerald-400" />
                ) : (
                  <Crown className="size-3 text-amber-400" />
                )}
                {formatRelativeTimeKo(entry.startedAt)}
              </span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
