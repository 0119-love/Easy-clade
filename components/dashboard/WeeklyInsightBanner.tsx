"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { fetchWeeklyInsight } from "@/lib/analytics/client";
import { PROVIDER_LABELS } from "@/lib/config/types";
import { cn } from "@/lib/utils";

// Same gradient treatment as DashboardHero, kept local to this component --
// see that file's comment for why it's an overlay div, not a Card className.
const GRADIENT = cn(
  "pointer-events-none absolute inset-0",
  "bg-gradient-to-r from-violet-500/90 via-indigo-500/70 to-transparent",
  "dark:from-violet-600/80 dark:via-indigo-700/60 dark:to-transparent",
);

export function WeeklyInsightBanner() {
  const { data, isPending } = useQuery({ queryKey: ["analytics", "insight"], queryFn: fetchWeeklyInsight });

  if (isPending || !data) return null;

  if (!data.hasAnyData) {
    return (
      <Card className="relative overflow-hidden p-6">
        <div aria-hidden className={GRADIENT} />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-white">
            아직 이번 주 사용 기록이 없습니다. 첫 실행을 시작하면 여기에 주간 인사이트가 표시됩니다.
          </p>
          <Link href="/app/run" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-white hover:underline">
            실행하러 가기 <ArrowRight className="size-4" />
          </Link>
        </div>
      </Card>
    );
  }

  const sentences: string[] = [];
  if (data.changePct !== null) {
    const rounded = Math.round(Math.abs(data.changePct) * 10) / 10;
    sentences.push(
      data.changePct >= 0
        ? `토큰 사용량이 지난주 대비 ${rounded}% 증가했습니다.`
        : `토큰 사용량이 지난주 대비 ${rounded}% 감소했습니다.`,
    );
  } else {
    sentences.push(`이번 주 토큰 사용량은 ${data.thisWeekTokens.toLocaleString()}개입니다 (지난주 기록 없음).`);
  }
  if (data.topProvider) {
    sentences.push(`이번 주 가장 많이 사용한 모델은 ${PROVIDER_LABELS[data.topProvider]}입니다.`);
  }

  const isUp = data.changePct === null ? true : data.changePct >= 0;

  return (
    <Card className="relative overflow-hidden p-6">
      <div aria-hidden className={GRADIENT} />
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isUp ? <ArrowUpRight className="size-5 text-white" /> : <ArrowDownRight className="size-5 text-white" />}
          <p className="text-sm font-medium text-white">{sentences.join(" ")}</p>
        </div>
        <Link href="/analytics" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-white hover:underline">
          자세히 보기 <ArrowRight className="size-4" />
        </Link>
      </div>
    </Card>
  );
}
