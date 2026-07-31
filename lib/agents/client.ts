import type { AgentCategory, AgentPresetRow } from "@/lib/agents/queries";
import type { ProviderId } from "@/lib/config/types";

export type { AgentPresetRow, AgentCategory };

export interface NewAgentPresetInput {
  name: string;
  provider: ProviderId;
  model: string;
  systemPrompt: string | null;
  temperature: number;
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  description: string | null;
  category: AgentCategory;
}

export async function fetchAgentPresets(): Promise<{ presets: AgentPresetRow[] }> {
  const res = await fetch("/api/agents");
  if (!res.ok) throw new Error("에이전트 목록을 불러오지 못했습니다.");
  return res.json();
}

export async function createAgentPreset(input: NewAgentPresetInput): Promise<void> {
  const res = await fetch("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "에이전트를 추가하지 못했습니다.");
  }
}

export async function deleteAgentPresetRemote(id: number): Promise<void> {
  const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("에이전트를 삭제하지 못했습니다.");
}
