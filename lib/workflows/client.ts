import type { WorkflowRow, WorkflowStep } from "@/lib/workflows/queries";
import type { WorkflowStepResult } from "@/lib/workflows/runWorkflow";

export type { WorkflowRow, WorkflowStep, WorkflowStepResult };

export async function fetchWorkflows(): Promise<{ workflows: WorkflowRow[] }> {
  const res = await fetch("/api/workflows");
  if (!res.ok) throw new Error("워크플로우 목록을 불러오지 못했습니다.");
  return res.json();
}

export async function createWorkflow(name: string, steps: WorkflowStep[]): Promise<void> {
  const res = await fetch("/api/workflows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, steps }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "워크플로우를 저장하지 못했습니다.");
  }
}

export async function deleteWorkflowRemote(id: number): Promise<void> {
  const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("워크플로우를 삭제하지 못했습니다.");
}

export async function runWorkflowRemote(id: number): Promise<{ results: WorkflowStepResult[] }> {
  const res = await fetch(`/api/workflows/${id}/run`, { method: "POST" });
  if (!res.ok) throw new Error("워크플로우 실행에 실패했습니다.");
  return res.json();
}
