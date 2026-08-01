"use client";

import { motion } from "framer-motion";
import { BRAIN_REGIONS, STATUS_COLOR, STATUS_LABEL } from "@/lib/brain/regions";
import type { BrainRegionStatus } from "@/lib/brain/queries";

/**
 * Floating detail card for a hovered/selected Brain node. Matte, not glass
 * (deliberately breaks from the app's .glass surface -- see BrainPulseView
 * for why this page is a "monitoring console" exception).
 */
export function BrainNodeInspector({ region }: { region: BrainRegionStatus }) {
  const meta = BRAIN_REGIONS.find((r) => r.id === region.id);
  if (!meta) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="pointer-events-none absolute right-4 top-4 w-64 rounded-lg border border-[#26262b] bg-[#131316] p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
        <span className="text-[13px] font-semibold tracking-tight text-[#f9fafb]">{meta.label}</span>
        <span
          className="ml-auto flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
          style={{ color: STATUS_COLOR[region.status], background: `${STATUS_COLOR[region.status]}1a` }}
        >
          <span className="size-1.5 rounded-full" style={{ background: STATUS_COLOR[region.status] }} />
          {STATUS_LABEL[region.status]}
        </span>
      </div>
      <div className="mt-0.5 text-[11px] text-[#6b7280]">{meta.description}</div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#26262b] pt-3">
        {region.metrics.map((m) => (
          <div key={m.label}>
            <div className="text-[10px] uppercase tracking-wide text-[#6b7280]">{m.label}</div>
            <div className="text-[15px] font-semibold tabular-nums text-[#f9fafb]">{m.value}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
