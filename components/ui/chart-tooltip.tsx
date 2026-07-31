interface ChartTooltipPayloadItem {
  dataKey: string;
  name: string;
  value: number;
  /** recharts attaches each series' stroke/fill color here automatically. */
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string;
  /** Multi-series charts (one line per provider) pass this so each row gets a
   * short color tick -- a single-series chart has nothing to disambiguate,
   * so this defaults off. */
  showColorIndicator?: boolean;
}

export function ChartTooltip({ active, payload, label, showColorIndicator }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-popover rounded-lg px-3 py-2 text-xs">
      <div className="mb-1 font-medium text-foreground">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-1.5 text-text-secondary">
          {showColorIndicator && p.color && (
            <span className="inline-block h-0.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
          )}
          <span>
            {p.name}: <span className="font-mono text-foreground">{p.value.toLocaleString()}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
