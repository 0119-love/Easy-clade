import type { KnowledgeRow } from "@/lib/knowledge/queries";

export type { KnowledgeRow };

export async function fetchKnowledge(search?: string): Promise<{ items: KnowledgeRow[] }> {
  const params = search?.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
  const res = await fetch(`/api/knowledge${params}`);
  if (!res.ok) throw new Error("지식 목록을 불러오지 못했습니다.");
  return res.json();
}

export async function createKnowledge(title: string, content: string): Promise<void> {
  const res = await fetch("/api/knowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) throw new Error("지식 항목을 추가하지 못했습니다.");
}

export async function deleteKnowledgeRemote(id: number): Promise<void> {
  const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("지식 항목을 삭제하지 못했습니다.");
}
