import type { TaskRow } from "@/lib/tasks/queries";

export type { TaskRow };

export async function fetchTasks(): Promise<{ tasks: TaskRow[] }> {
  const res = await fetch("/api/tasks");
  if (!res.ok) throw new Error("작업 목록을 불러오지 못했습니다.");
  return res.json();
}

export async function createTask(title: string, sourceRunId: number | null = null): Promise<void> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, sourceRunId }),
  });
  if (!res.ok) throw new Error("작업을 추가하지 못했습니다.");
}

export async function setTaskDoneRemote(id: number, done: boolean): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  });
  if (!res.ok) throw new Error("작업 상태를 변경하지 못했습니다.");
}

export async function deleteTaskRemote(id: number): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("작업을 삭제하지 못했습니다.");
}
