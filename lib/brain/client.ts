import type { BrainStatusResponse } from "./queries";
import type { BrainGraphSnapshot } from "./graph";

export type { BrainStatusResponse, BrainGraphSnapshot };

export async function fetchBrainStatus(): Promise<BrainStatusResponse> {
  const res = await fetch("/api/brain");
  if (!res.ok) throw new Error("브레인 상태를 불러오지 못했습니다.");
  return res.json();
}

export async function fetchBrainGraph(): Promise<BrainGraphSnapshot> {
  const res = await fetch("/api/brain/graph");
  if (!res.ok) throw new Error("브레인 그래프를 불러오지 못했습니다.");
  return res.json();
}
