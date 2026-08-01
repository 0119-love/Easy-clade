"use client";

import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import type { DailyStat } from "@/lib/history/queries";

const TOTAL_DAYS = 182; // ~26 weeks, GitHub-contribution-style
const LEVEL_COUNT = 5;

interface HeatmapDay {
  date: string;
  runCount: number;
  /** -1 = no activity (rendered as --muted, not part of the validated ramp); 0-4 = --heatmap-0..4. */
  level: number;
}

function levelForCount(count: number, max: number): number {
  if (count <= 0) return -1;
  if (max <= 0) return 0;
  const ratio = count / max;
  return Math.min(LEVEL_COUNT - 1, Math.floor(ratio * LEVEL_COUNT));
}

interface ActivityHeatmapProps {
  data: DailyStat[];
  isLoading?: boolean;
}

/** GitHub-style day grid -- real per-day run counts (getActivityHeatmapDays), bucketed into 5 intensity levels relative to this user's own busiest day in range. */
export function ActivityHeatmap({ data, isLoading }: ActivityHeatmapProps) {
  const weeks = useMemo<(HeatmapDay | null)[][]>(() => {
    if (data.length === 0) return [];
    const byDate = new Map(data.map((d) => [d.date, d]));
    const maxCount = Math.max(1, ...data.map((d) => d.runCount));

    const days: HeatmapDay[] = [];
    const today = new Date();
    for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const runCount = byDate.get(dateStr)?.runCount ?? 0;
      days.push({ date: dateStr, runCount, level: levelForCount(runCount, maxCount) });
    }

    // Pad the front so the first column starts on Sunday, matching a real calendar grid.
    const firstDow = new Date(`${days[0].date}T00:00:00`).getDay();
    const padded: (HeatmapDay | null)[] = [...Array.from({ length: firstDow }, () => null), ...days];

    const chunks: (HeatmapDay | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) chunks.push(padded.slice(i, i + 7));
    return chunks;
  }, [data]);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (data.length === 0) {
    return <p className="text-sm text-text-secondary">아직 표시할 활동 기록이 없습니다.</p>;
  }

  return (
    <div className="scroll-fade-x -mx-1 flex gap-1 overflow-x-auto px-1 pb-2">
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="flex flex-col gap-1">
          {week.map((day, dayIndex) =>
            day ? (
              <Tooltip key={day.date}>
                <TooltipTrigger
                  render={
                    <div
                      className="size-3 rounded-[2px]"
                      style={{ backgroundColor: day.level === -1 ? "var(--muted)" : `var(--heatmap-${day.level})` }}
                    />
                  }
                />
                <TooltipContent>
                  {day.date} · 실행 {day.runCount}회
                </TooltipContent>
              </Tooltip>
            ) : (
              <div key={dayIndex} className="size-3" />
            ),
          )}
        </div>
      ))}
    </div>
  );
}
