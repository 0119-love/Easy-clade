"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { createProject, deleteProjectRemote, fetchProjects, setProjectArchivedRemote } from "@/lib/projects/client";

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects(true) });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createProject(name.trim(), description.trim() || null);
      setName("");
      setDescription("");
      refresh();
      toast.success("프로젝트가 생성되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "프로젝트를 추가하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleArchive(id: number, archived: boolean) {
    try {
      await setProjectArchivedRemote(id, !archived);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "프로젝트 상태를 변경하지 못했습니다.");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteProjectRemote(id);
      refresh();
      toast.success("프로젝트가 삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "프로젝트를 삭제하지 못했습니다.");
    }
  }

  const projects = data?.projects ?? [];

  return (
    <div className="max-w-2xl space-y-8 px-10 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">프로젝트</h1>
        <p className="text-sm text-text-secondary">
          실행을 프로젝트별로 묶어 기록합니다. 대시보드 상단에서 현재 프로젝트를 선택하면 이후 실행이 자동으로
          태그됩니다.
        </p>
      </div>

      <Card className="space-y-3 p-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="프로젝트 이름" />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="설명 (선택)"
          className="min-h-16"
        />
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={() => void handleCreate()} disabled={saving || !name.trim()}>
            만들기
          </Button>
        </div>
      </Card>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <p className="text-sm text-text-secondary">아직 프로젝트가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <Card key={project.id} className={cn("flex items-center gap-3 p-4", project.archived && "opacity-50")}>
              <Link href={`/projects/${project.id}`} className="flex-1 space-y-0.5">
                <div className="text-sm font-medium text-foreground">{project.name}</div>
                {project.description && <p className="text-xs text-text-secondary">{project.description}</p>}
              </Link>
              <button
                type="button"
                onClick={() => void handleToggleArchive(project.id, project.archived)}
                className="text-text-secondary hover:text-foreground"
                title={project.archived ? "보관 해제" : "보관"}
              >
                {project.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(project.id)}
                className="text-text-secondary hover:text-danger"
              >
                <Trash2 className="size-3.5" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
