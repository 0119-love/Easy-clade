"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createKnowledge, deleteKnowledgeRemote, fetchKnowledge } from "@/lib/knowledge/client";

export default function KnowledgePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { data, isPending } = useQuery({ queryKey: ["knowledge", search], queryFn: () => fetchKnowledge(search) });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [adding, setAdding] = useState(false);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["knowledge"] });
  }

  async function handleAdd() {
    if (!title.trim() || !content.trim()) return;
    setAdding(true);
    try {
      await createKnowledge(title.trim(), content.trim());
      setTitle("");
      setContent("");
      refresh();
      toast.success("지식 항목이 추가되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "지식 항목을 추가하지 못했습니다.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteKnowledgeRemote(id);
      refresh();
      toast.success("지식 항목이 삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "지식 항목을 삭제하지 못했습니다.");
    }
  }

  const items = data?.items ?? [];

  return (
    <div className="max-w-2xl space-y-8 px-10 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">지식</h1>
        <p className="text-sm text-text-secondary">
          저장한 자료는 대시보드의 고급 옵션에서 시스템 프롬프트에 첨부해 특정 실행에만 참조시킬 수 있습니다. 제목·내용
          단순 검색만 지원합니다 (의미 기반 검색 아님).
        </p>
      </div>

      <Card className="space-y-3 p-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용..."
          className="min-h-24"
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={() => void handleAdd()}
            disabled={adding || !title.trim() || !content.trim()}
          >
            추가
          </Button>
        </div>
      </Card>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-secondary" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="제목 또는 내용 검색..."
          className="pl-9"
        />
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {search ? "검색 결과가 없습니다." : "아직 저장된 지식 항목이 없습니다."}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="glass-chip flex items-start gap-3 rounded-lg px-4 py-3">
              <div className="flex-1 space-y-1">
                <div className="text-sm font-medium text-foreground">{item.title}</div>
                <p className="line-clamp-2 text-xs text-text-secondary">{item.content}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(item.id)}
                className="shrink-0 text-text-secondary hover:text-danger"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
