"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { BrainKpis } from "@/lib/brain/queries";

interface Stat {
  label: string;
  value: string;
  tone?: "danger" | "warning" | "default";
}

function buildStats(k: BrainKpis | undefined): Stat[] {
  return [
    { label: "NODES", value: k ? `${k.nodeCount}` : "-" },
    { label: "CONNECTIONS", value: k ? `${k.connectionCount}` : "-" },
    { label: "RUNNING", value: k ? `${k.running}` : "-", tone: "warning" },
    { label: "PENDING", value: k ? `${k.pending}` : "-" },
    { label: "FAILED", value: k ? `${k.failedToday}` : "-", tone: k && k.failedToday > 0 ? "danger" : "default" },
    { label: "EVENTS/SEC", value: k ? k.eventsPerSec.toFixed(1) : "-" },
    { label: "AVG LATENCY", value: k?.avgLatencyMs != null ? `${Math.round(k.avgLatencyMs)}ms` : "-" },
    { label: "COST TODAY", value: k ? `$${k.costUsdToday.toFixed(2)}` : "-" },
  ];
}

const TONE_COLOR: Record<NonNullable<Stat["tone"]>, string> = {
  danger: "#f87171",
  warning: "#f59e0b",
  default: "#f9fafb",
};

export function BrainStatusBar({ kpis }: { kpis: BrainKpis | undefined }) {
  const stats = buildStats(kpis);

  return (
    <div className="flex divide-x divide-[#26262b] overflow-x-auto rounded-xl border border-[#26262b] bg-[#0e0e10]">
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-[104px] flex-1 px-4 py-3">
          <div className="text-[10.5px] font-medium tracking-wide text-[#6b7280]">{stat.label}</div>
          <div className="mt-1 h-[28px] overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={stat.value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 340, damping: 26 }}
                className="text-[22px] font-semibold tabular-nums"
                style={{ color: TONE_COLOR[stat.tone ?? "default"] }}
              >
                {stat.value}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}
