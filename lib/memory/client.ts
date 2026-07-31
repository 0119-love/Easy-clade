import type { MemoryRow } from "@/lib/memory/queries";

export type { MemoryRow };

export async function fetchMemory(): Promise<{ entries: MemoryRow[] }> {
  const res = await fetch("/api/memory");
  if (!res.ok) throw new Error("메모리를 불러오지 못했습니다.");
  return res.json();
}

export async function createMemory(content: string): Promise<void> {
  const res = await fetch("/api/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, pinned: true }),
  });
  if (!res.ok) throw new Error("메모리를 추가하지 못했습니다.");
}

export async function setMemoryPinnedRemote(id: number, pinned: boolean): Promise<void> {
  const res = await fetch(`/api/memory/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pinned }),
  });
  if (!res.ok) throw new Error("메모리 상태를 변경하지 못했습니다.");
}

export async function deleteMemoryRemote(id: number): Promise<void> {
  const res = await fetch(`/api/memory/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("메모리를 삭제하지 못했습니다.");
}
