import type { AutomationCategory, AutomationOutputType, AutomationRow, TriggerType } from "@/lib/automations/queries";
import type { FileRow } from "@/lib/files/queries";
import type { ProviderId } from "@/lib/config/types";

export type { AutomationOutputType, AutomationRow, TriggerType, AutomationCategory };

export interface NewAutomationInput {
  name: string;
  promptTemplate: string;
  provider: ProviderId;
  model: string;
  triggerType: TriggerType;
  intervalMinutes: number | null;
  outputType: AutomationOutputType;
  filename: string | null;
  category: AutomationCategory;
}

export async function fetchAutomations(): Promise<{ automations: AutomationRow[] }> {
  const res = await fetch("/api/automations");
  if (!res.ok) throw new Error("자동화 목록을 불러오지 못했습니다.");
  return res.json();
}

export async function createAutomation(input: NewAutomationInput): Promise<void> {
  const res = await fetch("/api/automations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "자동화를 추가하지 못했습니다.");
  }
}

export async function deleteAutomationRemote(id: number): Promise<void> {
  const res = await fetch(`/api/automations/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("자동화를 삭제하지 못했습니다.");
}

export async function runAutomationRemote(
  id: number,
): Promise<{ status: "success" | "error"; errorMessage: string | null; file: FileRow | null }> {
  const res = await fetch(`/api/automations/${id}/run`, { method: "POST" });
  if (!res.ok) throw new Error("자동화 실행에 실패했습니다.");
  return res.json();
}
