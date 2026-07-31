"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchAutomations, runAutomationRemote } from "@/lib/automations/client";

const CHECK_INTERVAL_MS = 60_000;

/**
 * Globally mounted (see app/layout.tsx) so interval-type automations fire on
 * any page, not just while viewing /automations. This is NOT background/OS
 * cron -- it only runs while this app is open in a browser tab, which is why
 * the Automations page labels it "앱이 열려 있는 동안" rather than claiming
 * true scheduled execution.
 */
export function AutomationRunner() {
  const queryClient = useQueryClient();
  const runningIds = useRef(new Set<number>());

  useEffect(() => {
    async function checkDue() {
      let automations;
      try {
        ({ automations } = await fetchAutomations());
      } catch {
        return;
      }

      const now = Date.now();
      for (const automation of automations) {
        if (automation.triggerType !== "interval" || !automation.intervalMinutes) continue;
        if (runningIds.current.has(automation.id)) continue;

        const dueAt = automation.lastRunAt
          ? new Date(automation.lastRunAt).getTime() + automation.intervalMinutes * 60_000
          : now;
        if (now < dueAt) continue;

        runningIds.current.add(automation.id);
        try {
          const result = await runAutomationRemote(automation.id);
          if (result.status === "error") {
            toast.error(`자동화 "${automation.name}" 실행 실패: ${result.errorMessage ?? "알 수 없는 오류"}`);
          } else if (result.file) {
            toast.success(`자동화 "${automation.name}"가 파일 "${result.file.filename}"을 생성했습니다.`);
          } else {
            toast.success(`자동화 "${automation.name}"가 실행되었습니다.`);
          }
          void queryClient.invalidateQueries({ queryKey: ["automations"] });
          void queryClient.invalidateQueries({ queryKey: ["history"] });
          void queryClient.invalidateQueries({ queryKey: ["files"] });
        } catch {
          // network hiccup -- next check cycle will retry
        } finally {
          runningIds.current.delete(automation.id);
        }
      }
    }

    void checkDue();
    const interval = setInterval(checkDue, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
}
