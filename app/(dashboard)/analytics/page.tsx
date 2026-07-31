"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderMark } from "@/components/ui/provider-mark";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PROVIDER_LABELS } from "@/lib/config/types";
import { fetchAnalytics, fetchUsageBuckets } from "@/lib/analytics/client";
import type { UsageGranularity } from "@/lib/history/queries";
import { cn } from "@/lib/utils";

const GRANULARITY_LABELS: Record<UsageGranularity, string> = {
  daily: "일별",
  weekly: "주별",
  monthly: "월별",
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: { dataKey: string; name: string; value: number }[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-popover rounded-lg px-3 py-2 text-xs">
      <div className="mb-1 font-medium text-foreground">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="text-text-secondary">
          {p.name}: <span className="font-mono text-foreground">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function formatDateShort(date: string): string {
  return date.slice(5);
}

/**
 * "지난 30일 대비" -- current 30-day cost vs the 30 days before that. `null`
 * means there was no prior-period spend for this provider to compare
 * against (a brand new provider, or one you haven't used before this
 * month), not a 0% change -- those are different things and shouldn't look
 * the same.
 */
function TrendBadge({ changePct }: { changePct: number | null }) {
  if (changePct === null) {
    return (
      <span className="flex items-center gap-1 text-xs text-text-secondary">
        <Minus className="size-3" /> 이전 기록 없음
      </span>
    );
  }
  const rounded = Math.round(changePct);
  if (rounded === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-text-secondary">
        <Minus className="size-3" /> 변동 없음
      </span>
    );
  }
  const isUp = rounded > 0;
  return (
    <span className={cn("flex items-center gap-1 text-xs", isUp ? "text-danger" : "text-success")}>
      {isUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(rounded)}%
    </span>
  );
}

export default function AnalyticsPage() {
  const { data, isPending } = useQuery({ queryKey: ["analytics"], queryFn: fetchAnalytics });
  const [granularity, setGranularity] = useState<UsageGranularity>("daily");
  const { data: usage, isPending: usagePending } = useQuery({
    queryKey: ["analytics-usage", granularity],
    queryFn: () => fetchUsageBuckets(granularity),
  });

  const maxRunCount = Math.max(1, ...(data?.providers.map((p) => p.runCount) ?? [0]));

  return (
    <div className="space-y-8 px-10 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">분석</h1>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">토큰 사용량</h2>
          <Tabs value={granularity} onValueChange={(v) => setGranularity(v as UsageGranularity)}>
            <TabsList>
              {(["daily", "weekly", "monthly"] as const).map((g) => (
                <TabsTrigger key={g} value={g}>
                  {GRANULARITY_LABELS[g]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {usagePending ? (
          <Skeleton className="h-64 w-full" />
        ) : !usage || usage.buckets.length === 0 ? (
          <p className="text-sm text-text-secondary">
            아직 {GRANULARITY_LABELS[granularity]} 단위로 표시할 실행 기록이 없습니다.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={usage.buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateShort}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <RechartsTooltip content={<ChartTooltip />} />
              <Bar dataKey="tokens" name="토큰" fill="var(--foreground)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        {usage && usage.buckets.length > 0 && (
          <div className="mt-4 flex items-center gap-6 text-xs text-text-secondary">
            <span>
              합계 토큰:{" "}
              <span className="font-mono text-foreground">
                {usage.buckets.reduce((sum, b) => sum + b.tokens, 0).toLocaleString()}
              </span>
            </span>
            <span>
              합계 비용:{" "}
              <span className="font-mono text-foreground">
                ${usage.buckets.reduce((sum, b) => sum + b.costUsd, 0).toFixed(4)}
              </span>
            </span>
            <span>
              실행 횟수:{" "}
              <span className="font-mono text-foreground">
                {usage.buckets.reduce((sum, b) => sum + b.runCount, 0)}
              </span>
            </span>
          </div>
        )}
      </Card>

      {isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold text-foreground">토큰 사용량 (최근 30일)</h2>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data?.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateShort}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="tokens" name="토큰" stroke="var(--foreground)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold text-foreground">비용 추이 (최근 30일)</h2>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data?.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateShort}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="costUsd"
                    name="비용($)"
                    stroke="var(--foreground)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold text-foreground">지난 30일 대비 비용</h2>
            {data && data.trend.some((t) => t.currentCostUsd > 0 || t.previousCostUsd > 0) ? (
              <div className="space-y-3">
                {data.trend
                  .filter((t) => t.currentCostUsd > 0 || t.previousCostUsd > 0)
                  .map((t) => (
                    <div key={t.provider} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm text-foreground">
                        <ProviderMark provider={t.provider} size="sm" />
                        {PROVIDER_LABELS[t.provider]}
                      </span>
                      <span className="font-mono text-xs text-text-secondary">${t.currentCostUsd.toFixed(4)}</span>
                      <TrendBadge changePct={t.changePct} />
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">아직 30일간 비교할 만한 실행 기록이 없습니다.</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold text-foreground">프로바이더별 사용량</h2>
            {data && data.providers.length > 0 ? (
              <div className="space-y-3">
                {data.providers.map((p) => (
                  <div key={p.provider} className="flex items-center gap-3">
                    <ProviderMark provider={p.provider} size="sm" />
                    <span className="w-20 shrink-0 text-sm text-foreground">{PROVIDER_LABELS[p.provider]}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--glass-border)]">
                      <div
                        className="h-full bg-foreground"
                        style={{ width: `${(p.runCount / maxRunCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs text-text-secondary">{p.runCount}회</span>
                    <span className="w-20 shrink-0 text-right font-mono text-xs text-text-secondary">
                      ${p.costUsd.toFixed(4)}
                    </span>
                    {p.errorCount > 0 && (
                      <span className="shrink-0 text-xs text-danger">오류 {p.errorCount}건</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">아직 실행 기록이 없습니다.</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold text-foreground">모델별 사용량</h2>
            {data && data.models.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-text-secondary">
                  <tr>
                    <th className="pb-2 pr-4 font-normal">프로바이더</th>
                    <th className="pb-2 pr-4 font-normal">모델</th>
                    <th className="pb-2 pr-4 font-normal">실행 횟수</th>
                    <th className="pb-2 pr-4 font-normal">토큰</th>
                    <th className="pb-2 font-normal">비용</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.models.map((m) => (
                    <tr key={`${m.provider}-${m.model}`}>
                      <td className="py-2 pr-4">
                        <span className="flex items-center gap-1.5">
                          <ProviderMark provider={m.provider} size="sm" />
                          {PROVIDER_LABELS[m.provider]}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">{m.model}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{m.runCount}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{m.tokens.toLocaleString()}</td>
                      <td className="py-2 font-mono text-xs">${m.costUsd.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-text-secondary">아직 실행 기록이 없습니다.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
