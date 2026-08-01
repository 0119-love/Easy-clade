import type { BrainRegionSnapshot } from "./queries";
import type { BrainGraphSnapshot } from "./graph";

export type { BrainRegionSnapshot, BrainGraphSnapshot };

export interface BrainSnapshotResponse {
  regions: BrainRegionSnapshot[];
  generatedAt: string;
}

export async function fetchBrainSnapshot(): Promise<BrainSnapshotResponse> {
  const res = await fetch("/api/brain");
  if (!res.ok) throw new Error("브레인 스냅샷을 불러오지 못했습니다.");
  return res.json();
}

export async function fetchBrainGraph(): Promise<BrainGraphSnapshot> {
  const res = await fetch("/api/brain/graph");
  if (!res.ok) throw new Error("브레인 그래프를 불러오지 못했습니다.");
  return res.json();
}
