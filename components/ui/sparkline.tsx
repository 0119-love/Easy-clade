"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
}

/** Minimal trend line for a provider card -- no axes, no grid, no tooltip, just shape. */
export function Sparkline({ data, color, height = 32 }: SparklineProps) {
  if (data.length < 2) return <div style={{ height }} />;
  const points = data.map((value, i) => ({ i, value }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
