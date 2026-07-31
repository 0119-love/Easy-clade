"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderMark } from "@/components/ui/provider-mark";
import { PROVIDER_IDS, PROVIDER_LABELS, type ProviderId } from "@/lib/config/types";
import type { ModelInfo } from "@/lib/providers/types";
import {
  createWorkflow,
  deleteWorkflowRemote,
  fetchWorkflows,
  runWorkflowRemote,
  type WorkflowStep,
  type WorkflowStepResult,
} from "@/lib/workflows/client";

interface ModelsResponse {
  models: Record<string, ModelInfo[]>;
}

async function fetchModels(): Promise<ModelsResponse> {
  const res = await fetch("/api/models");
  if (!res.ok) throw new Error("모델 목록을 불러오지 못했습니다.");
  return res.json();
}

function emptyStep(): WorkflowStep {
  return { provider: "anthropic", model: "", promptTemplate: "" };
}

export default function WorkflowsPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["workflows"], queryFn: fetchWorkflows });
  const { data: modelsData } = useQuery({ queryKey: ["models"], queryFn: fetchModels });

  const [name, setName] = useState("");
  const [steps, setSteps] = useState<WorkflowStep[]>([emptyStep()]);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, WorkflowStepResult[]>>({});

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["workflows"] });
  }

  function updateStep(index: number, patch: Partial<WorkflowStep>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, emptyStep()]);
  }

  function removeStep(index: number) {
    setSteps((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleSave() {
    if (!name.trim() || steps.some((s) => !s.model || !s.promptTemplate.trim())) return;
    setSaving(true);
    try {
      await createWorkflow(name.trim(), steps);
      setName("");
      setSteps([emptyStep()]);
      refresh();
      toast.success("워크플로우가 저장되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "워크플로우를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteWorkflowRemote(id);
      refresh();
      toast.success("워크플로우가 삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "워크플로우를 삭제하지 못했습니다.");
    }
  }

  async function handleRun(id: number) {
    setRunningId(id);
    try {
      const { results: stepResults } = await runWorkflowRemote(id);
      setResults((prev) => ({ ...prev, [id]: stepResults }));
      const failed = stepResults.some((r) => r.error);
      if (failed) toast.error("일부 단계에서 오류가 발생했습니다.");
      else toast.success("워크플로우 실행이 완료되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "워크플로우 실행에 실패했습니다.");
    } finally {
      setRunningId(null);
    }
  }

  const workflows = data?.workflows ?? [];

  return (
    <div className="max-w-3xl space-y-8 px-10 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">워크플로우</h1>
        <p className="text-sm text-text-secondary">
          프롬프트를 순서대로 연결합니다. 이후 단계의 프롬프트에서 <code className="font-mono">{"{{step1.output}}"}</code>
          처럼 이전 단계의 출력을 참조할 수 있습니다. 분기 없는 순차 체인만 지원합니다.
        </p>
      </div>

      <Card className="space-y-4 p-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="워크플로우 이름" />
        <div className="space-y-3">
          {steps.map((step, i) => {
            const modelOptions = modelsData?.models[step.provider] ?? [];
            return (
              <div key={i} className="glass-chip space-y-2 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary">단계 {i + 1}</span>
                  {steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(i)} className="text-text-secondary hover:text-danger">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={step.provider}
                    onValueChange={(v) => updateStep(i, { provider: v as ProviderId, model: "" })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v: string) => PROVIDER_LABELS[v as ProviderId]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_IDS.map((id) => (
                        <SelectItem key={id} value={id}>
                          {PROVIDER_LABELS[id]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={step.model} onValueChange={(v) => updateStep(i, { model: v as string })}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v: string) => modelOptions.find((m) => m.id === v)?.label ?? "모델 선택"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {modelOptions.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={step.promptTemplate}
                  onChange={(e) => updateStep(i, { promptTemplate: e.target.value })}
                  placeholder={i === 0 ? "프롬프트..." : "프롬프트... (예: {{step1.output}}를 요약해줘)"}
                  className="min-h-16"
                />
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <Button type="button" size="sm" variant="ghost" onClick={addStep}>
            <Plus className="size-3.5" /> 단계 추가
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving || !name.trim() || steps.some((s) => !s.model || !s.promptTemplate.trim())}
          >
            저장
          </Button>
        </div>
      </Card>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <p className="text-sm text-text-secondary">아직 저장된 워크플로우가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{workflow.name}</div>
                  <div className="text-xs text-text-secondary">{workflow.steps.length}단계</div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleRun(workflow.id)}
                  disabled={runningId === workflow.id}
                >
                  <Play className="size-3.5" /> {runningId === workflow.id ? "실행 중..." : "실행"}
                </Button>
                <button
                  type="button"
                  onClick={() => void handleDelete(workflow.id)}
                  className="text-text-secondary hover:text-danger"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              {results[workflow.id] && (
                <div className="space-y-2 border-t border-border pt-3">
                  {results[workflow.id].map((r) => (
                    <div key={r.stepIndex} className="glass-chip space-y-1 rounded-lg p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <ProviderMark provider={r.provider as ProviderId} size="sm" />
                        단계 {r.stepIndex + 1} · {r.model}
                      </div>
                      {r.error ? (
                        <p className="text-danger">{r.error}</p>
                      ) : (
                        <p className="whitespace-pre-wrap text-text-secondary">{r.output}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
