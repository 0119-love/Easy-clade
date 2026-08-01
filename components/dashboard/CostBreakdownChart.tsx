"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { PROVIDER_LABELS, type ProviderId } from "@/lib/config/types";
import { CHART_PROVIDER_COLORS } from "@/lib/config/chartColors";
import type { ProviderBreakdown } from "@/lib/history/queries";

interface CostBreakdownChartProps {
  data: ProviderBreakdown[];
  isLoading?: boolean;
}

/** All-time cost per provider (reuses getProviderBreakdown -- no new query) -- cost breakdown is naturally cumulative, not a daily view. */
export function CostBreakdownChart({ data, isLoading }: CostBreakdownChartProps) {
  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const withCost = data.filter((d) => d.costUsd > 0).sort((a, b) => b.costUsd - a.costUsd);
  if (withCost.length === 0) {
    return <p className="text-sm text-text-secondary">아직 비용이 발생한 실행 기록이 없습니다.</p>;
  }

  const chartData = withCost.map((d) => ({ provider: d.provider, label: PROVIDER_LABELS[d.provider], cost: d.costUsd }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 40)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 12, fill: "var(--foreground)" }} />
        <RechartsTooltip content={<ChartTooltip />} />
        <Bar dataKey="cost" name="비용($)" radius={[0, 4, 4, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.provider} fill={CHART_PROVIDER_COLORS[entry.provider as ProviderId]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
