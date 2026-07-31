"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { PROVIDER_IDS, PROVIDER_LABELS, type ProviderId } from "@/lib/config/types";
import type { DashboardTrendPoint } from "@/app/api/analytics/dashboard/trend/route";

/**
 * Chart-only palette -- deliberately separate from the shared --provider-*
 * tokens (badges/icons elsewhere), validated with the dataviz skill's
 * categorical-palette checker for a 6-line simultaneous chart:
 * xai/openai/google were re-stepped because the shared badge colors read
 * too gray (xai had ~zero chroma) or collided under deuteranopia/
 * protanopia simulation (openai vs google, adjacent ΔE 3.0 against an 8
 * target). anthropic/perplexity/deepseek are untouched brand colors, left
 * as-is by design -- this app's badge/icon colors elsewhere are out of
 * scope for this chart-only fix.
 */
const CHART_COLORS: Record<ProviderId, string> = {
  anthropic: "#e08d6d",
  openai: "#8b4fd1",
  google: "#2a9dc9",
  xai: "#a3822f",
  perplexity: "#7fd4c9",
  deepseek: "#7b9cf0",
};

function formatBucketLabel(bucket: string): string {
  // "YYYY-MM-DD HH:00" (24h view) -> "HH:00" ; "YYYY-MM-DD" (7d/30d) -> "MM-DD"
  return bucket.includes(" ") ? bucket.split(" ")[1] : bucket.slice(5);
}

function legendLabel(value: string): string {
  return PROVIDER_LABELS[value as ProviderId] ?? value;
}

interface TokenTrendChartProps {
  points: DashboardTrendPoint[];
  isLoading?: boolean;
}

export function TokenTrendChart({ points, isLoading }: TokenTrendChartProps) {
  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (points.length === 0) {
    return <p className="text-sm text-text-secondary">아직 표시할 사용량 기록이 없습니다.</p>;
  }

  const data = points.map((p) => ({ bucket: p.bucket, ...p.values }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="bucket" tickFormatter={formatBucketLabel} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <RechartsTooltip content={<ChartTooltip showColorIndicator />} labelFormatter={(label) => formatBucketLabel(String(label))} />
        <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendLabel} />
        {PROVIDER_IDS.map((id) => (
          <Line
            key={id}
            type="monotone"
            dataKey={id}
            name={PROVIDER_LABELS[id]}
            stroke={CHART_COLORS[id]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
