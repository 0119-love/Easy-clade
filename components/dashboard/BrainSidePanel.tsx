"use client";

import { AlertTriangle, CheckCircle2, Workflow } from "lucide-react";
import { ProviderMark } from "@/components/ui/provider-mark";
import { PROVIDER_LABELS } from "@/lib/config/types";
import { HISTORY_STATUS_LABELS, formatRelativeTimeKo } from "@/lib/i18n/labels";
import type { BrainStatusResponse } from "@/lib/brain/queries";
import { cn } from "@/lib/utils";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#26262b] px-4 py-3.5 last:border-b-0">
      <div className="mb-2.5 text-[10.5px] font-medium tracking-wide text-[#6b7280]">{title}</div>
      {children}
    </div>
  );
}

const STATUS_DOT_CLASS: Record<string, string> = {
  success: "bg-[#10b981]",
  error: "bg-[#f87171]",
  stopped: "bg-[#6b7280]",
};

/**
 * The 340px "ops console" side panel -- keeps the Pulse/Graph canvas from
 * being the only thing on screen (spec: reduce empty space, raise
 * information density). Every field reads from the same /api/brain payload
 * the KPI bar and node inspectors use; nothing here is re-derived client-side.
 */
export function BrainSidePanel({ status, isLoading }: { status: BrainStatusResponse | undefined; isLoading: boolean }) {
  return (
    <div
      className={cn(
        "h-[520px] w-[340px] shrink-0 overflow-y-auto rounded-xl border border-[#26262b] bg-[#0e0e10] transition-opacity",
        isLoading && "opacity-60",
      )}
    >
      <Section title="TOP AGENT">
        {status?.topAgent ? (
          <div className="flex items-center gap-2.5">
            <ProviderMark provider={status.topAgent.provider} size="sm" />
            <div>
              <div className="text-[13px] font-medium text-[#f9fafb]">{PROVIDER_LABELS[status.topAgent.provider]}</div>
              <div className="text-[11px] text-[#6b7280]">오늘 {status.topAgent.runCount}회 실행</div>
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-[#6b7280]">오늘 실행 기록이 없습니다.</p>
        )}
      </Section>

      <Section title="최근 워크플로우">
        {status?.recentWorkflow ? (
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#c985001a] text-[#c98500]">
              <Workflow className="size-3.5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-[#f9fafb]">{status.recentWorkflow.name}</div>
              <div className="text-[11px] text-[#6b7280]">{formatRelativeTimeKo(status.recentWorkflow.createdAt)}</div>
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-[#6b7280]">등록된 워크플로우가 없습니다.</p>
        )}
      </Section>

      <Section title="MEMORY">
        <div className="flex items-center justify-between text-[13px] text-[#f9fafb]">
          <span>
            고정 {status?.memory.pinnedCount ?? 0} / 전체 {status?.memory.totalCount ?? 0}
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#1c1c1f]">
          <div
            className="h-full rounded-full bg-[#199e70]"
            style={{
              width: `${status && status.memory.totalCount > 0 ? Math.min(100, (status.memory.pinnedCount / status.memory.totalCount) * 100) : 0}%`,
            }}
          />
        </div>
      </Section>

      <Section title="TOKEN USAGE · COST TODAY">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[18px] font-semibold tabular-nums text-[#f9fafb]">
              {((status?.tokenUsageToday.inputTokens ?? 0) + (status?.tokenUsageToday.outputTokens ?? 0)).toLocaleString()}
            </div>
            <div className="text-[10.5px] text-[#6b7280]">토큰</div>
          </div>
          <div>
            <div className="text-[18px] font-semibold tabular-nums text-[#f9fafb]">${(status?.kpis.costUsdToday ?? 0).toFixed(2)}</div>
            <div className="text-[10.5px] text-[#6b7280]">비용</div>
          </div>
        </div>
      </Section>

      <Section title={`QUEUE${status?.queue.length ? ` (${status.queue.length})`: ""}`}>
        {status && status.queue.length > 0 ? (
          <ul className="space-y-2">
            {status.queue.map((q) => (
              <li key={q.name} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="truncate text-[#f9fafb]">{q.name}</span>
                <span className="shrink-0 text-[#f59e0b]">{q.overdueMinutes == null ? "대기 중" : `${q.overdueMinutes}분 지연`}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-1.5 text-[12px] text-[#6b7280]">
            <CheckCircle2 className="size-3.5 text-[#10b981]" /> 대기 중인 자동화 없음
          </p>
        )}
      </Section>

      <Section title="최근 오류">
        {status && status.recentErrors.length > 0 ? (
          <ul className="space-y-2">
            {status.recentErrors.map((e) => (
              <li key={e.id} className="flex items-start gap-2 text-[12px]">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[#f87171]" />
                <div className="min-w-0">
                  <div className="truncate text-[#f9fafb]">{PROVIDER_LABELS[e.label as keyof typeof PROVIDER_LABELS] ?? e.label}</div>
                  <div className="truncate text-[11px] text-[#6b7280]">
                    {e.detail ?? "오류"} · {formatRelativeTimeKo(e.startedAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-1.5 text-[12px] text-[#6b7280]">
            <CheckCircle2 className="size-3.5 text-[#10b981]" /> 오늘 오류 없음
          </p>
        )}
      </Section>

      <Section title="TIMELINE">
        {status && status.activity.length > 0 ? (
          <ul className="space-y-2.5">
            {status.activity.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-[12px]">
                <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT_CLASS[a.status] ?? "bg-[#6b7280]")} />
                <span className="text-[#f9fafb]">{PROVIDER_LABELS[a.label as keyof typeof PROVIDER_LABELS] ?? a.label}</span>
                {a.detail && <span className="truncate text-[#6b7280]">· {a.detail}</span>}
                <span className="ml-auto shrink-0 text-[11px] text-[#6b7280]">
                  {HISTORY_STATUS_LABELS[a.status as keyof typeof HISTORY_STATUS_LABELS] ?? a.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-[#6b7280]">아직 활동 기록이 없습니다.</p>
        )}
      </Section>
    </div>
  );
}
