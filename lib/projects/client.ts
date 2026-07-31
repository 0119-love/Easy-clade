import type { ProjectRow } from "@/lib/projects/queries";

export type { ProjectRow };

export async function fetchProjects(includeArchived = false): Promise<{ projects: ProjectRow[] }> {
  const res = await fetch(`/api/projects${includeArchived ? "?includeArchived=true" : ""}`);
  if (!res.ok) throw new Error("프로젝트 목록을 불러오지 못했습니다.");
  return res.json();
}

export async function fetchProject(id: number): Promise<{ project: ProjectRow }> {
  const res = await fetch(`/api/projects/${id}`);
  if (!res.ok) throw new Error("프로젝트를 찾을 수 없습니다.");
  return res.json();
}

export async function createProject(name: string, description: string | null): Promise<void> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error("프로젝트를 추가하지 못했습니다.");
}

export async function setProjectArchivedRemote(id: number, archived: boolean): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archived }),
  });
  if (!res.ok) throw new Error("프로젝트 상태를 변경하지 못했습니다.");
}

export async function deleteProjectRemote(id: number): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("프로젝트를 삭제하지 못했습니다.");
}
