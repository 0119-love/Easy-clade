"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createMemory,
  deleteMemoryRemote,
  fetchMemory,
  setMemoryPinnedRemote,
  type MemoryRow,
} from "@/lib/memory/client";

export default function MemoryPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["memory"], queryFn: fetchMemory });
  const [content, setContent] = useState("");
  const [adding, setAdding] = useState(false);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["memory"] });
  }

  async function handleAdd() {
    if (!content.trim()) return;
    setAdding(true);
    try {
      await createMemory(content.trim());
      setContent("");
      refresh();
      toast.success("메모리가 추가되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "메모리를 추가하지 못했습니다.");
    } finally {
      setAdding(false);
    }
  }

  async function handleTogglePin(entry: MemoryRow) {
    try {
      await setMemoryPinnedRemote(entry.id, !entry.pinned);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "메모리 상태를 변경하지 못했습니다.");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMemoryRemote(id);
      refresh();
      toast.success("메모리가 삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "메모리를 삭제하지 못했습니다.");
    }
  }

  const entries = data?.entries ?? [];
  const pinnedCount = entries.filter((e) => e.pinned).length;

  return (
    <div className="max-w-2xl space-y-8 px-10 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">메모리</h1>
        <p className="text-sm text-text-secondary">
          짧은 지속 정보를 저장해두면, 고정된(📌) 항목은 모든 모델 실행의 시스템 프롬프트에 자동으로 포함됩니다.
          {pinnedCount > 0 && ` 현재 ${pinnedCount}개 고정됨.`}
        </p>
      </div>

      <Card className="space-y-3 p-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="예: 나는 한국어로 답변받는 것을 선호한다..."
          className="min-h-20"
        />
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={() => void handleAdd()} disabled={adding || !content.trim()}>
            추가
          </Button>
        </div>
      </Card>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-text-secondary">아직 저장된 메모리가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="glass-chip flex items-start gap-3 rounded-lg px-4 py-3">
              <p className="flex-1 text-sm text-foreground">{entry.content}</p>
              <button
                type="button"
                onClick={() => void handleTogglePin(entry)}
                className="shrink-0 text-text-secondary hover:text-foreground"
                title={entry.pinned ? "고정 해제" : "고정"}
              >
                {entry.pinned ? <Pin className="size-3.5 fill-current" /> : <PinOff className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(entry.id)}
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
