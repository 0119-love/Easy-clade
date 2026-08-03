import type { BrainStatusResponse } from "./queries";
import type { BrainGraphSnapshot } from "./graph";
import type { BrainHistoryEntry } from "@/lib/history/queries";

export type { BrainStatusResponse, BrainGraphSnapshot, BrainHistoryEntry };

export async function fetchBrainStatus(isDemo: boolean = false): Promise<BrainStatusResponse> {
  const url = isDemo ? "/api/brain?demo=true" : "/api/brain";
  const res = await fetch(url);
  if (!res.ok) throw new Error("브레인 상태를 불러오지 못했습니다.");
  return res.json();
}

/** The orchestrator's own run history (BrainOrchestratorView), not the knowledge-graph BrainStatusResponse/BrainGraphSnapshot above -- two different "브레인" concepts sharing this client module. */
export async function fetchBrainHistory(): Promise<{ entries: BrainHistoryEntry[] }> {
  const res = await fetch("/api/brain/history");
  if (!res.ok) throw new Error("브레인 기록을 불러오지 못했습니다.");
  return res.json();
}

export async function fetchBrainGraph(): Promise<BrainGraphSnapshot> {
  const res = await fetch("/api/brain/graph");
  if (!res.ok) throw new Error("브레인 그래프를 불러오지 못했습니다.");
  return res.json();
}
