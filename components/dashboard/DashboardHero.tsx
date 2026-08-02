"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { useSystemStatus } from "@/lib/hooks/useSystemStatus";
import { fetchCurrentUser } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

const DATE_FMT = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
const TIME_FMT = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/**
 * The dashboard's one deliberately-colorful surface -- a purple/indigo
 * gradient overlay, scoped to this card only (see the plan doc). Layered as
 * an absolutely-positioned child instead of on Card's own className: Card
 * paints its background via the `.glass` utility, and stacking a Tailwind
 * gradient utility on the same element would leave two custom utility
 * classes (neither recognized by tailwind-merge) fighting over background,
 * with the winner decided by Tailwind's internal stylesheet order rather
 * than anything visible in this file.
 */
export function DashboardHero() {
  const status = useSystemStatus();
  const { data: me, isPending: mePending } = useQuery({ queryKey: ["auth", "me"], queryFn: fetchCurrentUser });
  // Starts null so the server-rendered and first client-rendered markup
  // match -- filling in the real time only after mount avoids a hydration
  // mismatch on something that's different every single render.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // No immediate setNow() call here -- only the deferred interval tick
    // sets state, so this never fires synchronously during the effect body
    // itself. Costs a ~1s "--:--:--" flash on mount in exchange for that.
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const name = me?.displayName?.trim() || me?.email?.split("@")[0];

  return (
    <Card className="relative overflow-hidden p-6 sm:p-8">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0",
          "bg-gradient-to-br from-violet-500/90 via-indigo-500/80 to-violet-400/20",
          "dark:from-violet-600/85 dark:via-indigo-700/75 dark:to-transparent",
        )}
      />
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-white sm:text-[32px]">
            {mePending ? "안녕하세요!" : `안녕하세요, ${name}님!`}
          </h1>
          <p className="mt-1 text-sm text-white/80">오늘의 사용량과 시스템 상태를 한눈에 확인하세요.</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="text-right">
            <p className="text-lg font-semibold tabular-nums text-white">{now ? TIME_FMT.format(now) : "--:--:--"}</p>
            <p className="text-xs text-white/70">{now ? DATE_FMT.format(now) : ""}</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white">
            <span className={cn("size-1.5 rounded-full", status.dotClass)} />
            {status.label}
          </span>
        </div>
      </div>
    </Card>
  );
}
