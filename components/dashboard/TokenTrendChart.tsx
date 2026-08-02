"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PROVIDER_IDS, PROVIDER_LABELS, type ProviderId } from "@/lib/config/types";
import { CHART_PROVIDER_COLORS } from "@/lib/config/chartColors";
import type { DashboardRange } from "@/lib/history/queries";
import type { DashboardTrendPoint } from "@/app/api/analytics/dashboard/trend/route";

const RANGE_LABELS: Record<DashboardRange, string> = {
  hourly: "시간",
  daily: "일",
  monthly: "월",
};

function formatBucketLabel(bucket: string, range: DashboardRange): string {
  if (range === "hourly") return bucket.split(" ")[1] ?? bucket; // "YYYY-MM-DD HH:00" -> "HH:00"
  if (range === "monthly") return bucket.slice(2); // "YYYY-MM" -> "YY-MM"
  return bucket.slice(5); // "YYYY-MM-DD" -> "MM-DD"
}

function legendLabel(value: string): string {
  return PROVIDER_LABELS[value as ProviderId] ?? value;
}

interface TokenTrendChartProps {
  points: DashboardTrendPoint[];
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
  isLoading?: boolean;
}

export function TokenTrendChart({ points, range, onRangeChange, isLoading }: TokenTrendChartProps) {
  const data = points.map((p) => ({ bucket: p.bucket, ...p.values }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Tabs value={range} onValueChange={(v) => v && onRangeChange(v as DashboardRange)}>
          <TabsList>
            {(["hourly", "daily", "monthly"] as const).map((r) => (
              <TabsTrigger key={r} value={r}>
                {RANGE_LABELS[r]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : points.length === 0 ? (
        <p className="flex h-72 items-center justify-center text-sm text-text-secondary">
          아직 표시할 사용량 기록이 없습니다.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              {PROVIDER_IDS.map((id) => (
                <linearGradient key={id} id={`trend-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_PROVIDER_COLORS[id]} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={CHART_PROVIDER_COLORS[id]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="bucket"
              tickFormatter={(v) => formatBucketLabel(String(v), range)}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <RechartsTooltip
              content={<ChartTooltip showColorIndicator />}
              labelFormatter={(label) => formatBucketLabel(String(label), range)}
              cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "4 4" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendLabel} />
            {PROVIDER_IDS.map((id) => (
              <Area
                key={`${id}-area`}
                type="monotone"
                dataKey={id}
                stroke="none"
                fill={`url(#trend-fill-${id})`}
                isAnimationActive={false}
                legendType="none"
                tooltipType="none"
              />
            ))}
            {PROVIDER_IDS.map((id) => (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                name={PROVIDER_LABELS[id]}
                stroke={CHART_PROVIDER_COLORS[id]}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: CHART_PROVIDER_COLORS[id] }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--card)" }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
