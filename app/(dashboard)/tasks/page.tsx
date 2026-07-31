"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { createTask, deleteTaskRemote, fetchTasks, setTaskDoneRemote, type TaskRow } from "@/lib/tasks/client";

function TaskRowItem({
  task,
  onToggle,
  onDelete,
}: {
  task: TaskRow;
  onToggle: (task: TaskRow) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="glass-chip flex items-center gap-3 rounded-lg px-3 py-2">
      <button
        type="button"
        onClick={() => onToggle(task)}
        className="shrink-0 text-text-secondary hover:text-foreground"
      >
        {task.done ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4" />}
      </button>
      <span className={cn("flex-1 text-sm", task.done ? "text-text-secondary line-through" : "text-foreground")}>
        {task.title}
      </span>
      {task.sourceRunId && <span className="text-[11px] text-text-secondary">실행 #{task.sourceRunId}</span>}
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        className="shrink-0 text-text-secondary hover:text-danger"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function handleAdd() {
    if (!title.trim()) return;
    setAdding(true);
    try {
      await createTask(title.trim());
      setTitle("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "작업을 추가하지 못했습니다.");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(task: TaskRow) {
    try {
      await setTaskDoneRemote(task.id, !task.done);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "작업 상태를 변경하지 못했습니다.");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTaskRemote(id);
      refresh();
      toast.success("작업이 삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "작업을 삭제하지 못했습니다.");
    }
  }

  const tasks = data?.tasks ?? [];
  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div className="max-w-2xl space-y-8 px-10 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">작업</h1>

      <Card className="flex gap-2 p-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
          placeholder="새 작업 추가..."
        />
        <Button type="button" size="sm" onClick={() => void handleAdd()} disabled={adding || !title.trim()}>
          추가
        </Button>
      </Card>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-text-secondary">아직 작업이 없습니다.</p>
      ) : (
        <div className="space-y-6">
          <div className="space-y-1.5">
            {pending.length === 0 ? (
              <p className="text-xs text-text-secondary">남은 작업이 없습니다.</p>
            ) : (
              pending.map((task) => (
                <TaskRowItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />
              ))
            )}
          </div>
          {done.length > 0 && (
            <div className="space-y-1.5">
              <h2 className="text-xs font-medium text-text-secondary">완료됨</h2>
              {done.map((task) => (
                <TaskRowItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
