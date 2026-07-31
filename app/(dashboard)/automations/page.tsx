"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, Code2, FileText, FolderKanban, MousePointerClick, PenLine, Play, Plus, Terminal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProviderMark } from "@/components/ui/provider-mark";
import { PROVIDER_IDS, PROVIDER_LABELS, type ProviderId } from "@/lib/config/types";
import type { ModelInfo } from "@/lib/providers/types";
import {
  createAutomation,
  deleteAutomationRemote,
  fetchAutomations,
  runAutomationRemote,
  type AutomationCategory,
  type AutomationOutputType,
  type AutomationRow,
  type TriggerType,
} from "@/lib/automations/client";
import { AUTOMATION_TEMPLATES } from "@/lib/automations/templates";
import { fileUrl } from "@/lib/files/client";
import { formatRelativeTimeKo } from "@/lib/i18n/labels";

interface ModelsResponse {
  models: Record<string, ModelInfo[]>;
}

async function fetchModels(): Promise<ModelsResponse> {
  const res = await fetch("/api/models");
  if (!res.ok) throw new Error("모델 목록을 불러오지 못했습니다.");
  return res.json();
}

const CATEGORY_ICON: Record<AutomationCategory, typeof Code2> = {
  content: PenLine,
  productivity: Terminal,
  dev: Code2,
  custom: FileText,
};

const CATEGORY_LABEL: Record<AutomationCategory, string> = {
  content: "콘텐츠",
  productivity: "생산성",
  dev: "개발",
  custom: "직접 만든 것",
};

export default function AutomationsPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["automations"], queryFn: fetchAutomations });
  const { data: modelsData } = useQuery({ queryKey: ["models"], queryFn: fetchModels });

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [name, setName] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [provider, setProvider] = useState<ProviderId>("anthropic");
  const [model, setModel] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("manual");
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [outputType, setOutputType] = useState<AutomationOutputType>("text");
  const [filename, setFilename] = useState("");
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [addingTemplateId, setAddingTemplateId] = useState<string | null>(null);

  const modelOptions = modelsData?.models[provider] ?? [];

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["automations"] });
  }

  async function handleCreate() {
    if (!name.trim() || !promptTemplate.trim() || !model) return;
    setSaving(true);
    try {
      await createAutomation({
        name: name.trim(),
        promptTemplate: promptTemplate.trim(),
        provider,
        model,
        triggerType,
        intervalMinutes: triggerType === "interval" ? intervalMinutes : null,
        outputType,
        filename: outputType === "code" ? filename.trim() || null : null,
        category: "custom",
      });
      setName("");
      setPromptTemplate("");
      setFilename("");
      refresh();
      toast.success("자동화가 저장되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "자동화를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTemplate(template: (typeof AUTOMATION_TEMPLATES)[number]) {
    const options = modelsData?.models[template.provider] ?? [];
    if (options.length === 0) {
      toast.error("모델 목록을 아직 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setAddingTemplateId(template.id);
    try {
      await createAutomation({
        name: template.name,
        promptTemplate: template.promptTemplate,
        provider: template.provider,
        model: options[0].id,
        triggerType: template.triggerType,
        intervalMinutes: template.intervalMinutes,
        outputType: template.outputType,
        filename: null,
        category: template.category,
      });
      refresh();
      toast.success(`"${template.name}" 템플릿을 추가했습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "템플릿을 추가하지 못했습니다.");
    } finally {
      setAddingTemplateId(null);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteAutomationRemote(id);
      refresh();
      toast.success("자동화가 삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "자동화를 삭제하지 못했습니다.");
    }
  }

  async function handleRun(id: number) {
    setRunningId(id);
    try {
      const result = await runAutomationRemote(id);
      if (result.status === "error") {
        toast.error(result.errorMessage ?? "실행에 실패했습니다.");
      } else if (result.file) {
        const file = result.file;
        toast.success(`파일 "${file.filename}"이 생성되었습니다.`, {
          action: { label: "열기", onClick: () => window.open(fileUrl(file.id), "_blank") },
        });
        void queryClient.invalidateQueries({ queryKey: ["files"] });
      } else {
        toast.success("실행이 완료되었습니다.");
      }
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["history"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "실행에 실패했습니다.");
    } finally {
      setRunningId(null);
    }
  }

  const automations = data?.automations ?? [];
  const grouped = automations.reduce<Record<string, AutomationRow[]>>((acc, automation) => {
    (acc[automation.category] ??= []).push(automation);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl space-y-8 px-10 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">자동화</h1>
        <p className="text-sm text-text-secondary">
          저장된 프롬프트를 &ldquo;지금 실행&rdquo; 버튼으로 바로 돌리거나, 정해진 간격으로 반복시킵니다. OS
          수준의 백그라운드 스케줄링이 아니라, 이 앱이 브라우저에서 열려 있는 동안만 자동 실행됩니다.
        </p>
      </div>

      <Card className="space-y-3 p-4">
        <div className="text-xs font-medium tracking-wide text-text-secondary">트리거 두 가지</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <MousePointerClick className="mt-0.5 size-4 text-text-secondary" />
            <div>
              <div className="text-sm font-medium text-foreground">수동 실행</div>
              <p className="text-xs text-text-secondary">
                버튼을 누를 때만 실행됩니다. 반복 작업(회의록 정리, 코드 생성 등)을 매번 새로 설명하지 않고 저장해둔
                프롬프트로 단축하고 싶을 때 씁니다.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 size-4 text-text-secondary" />
            <div>
              <div className="text-sm font-medium text-foreground">간격 실행</div>
              <p className="text-xs text-text-secondary">
                이 앱을 브라우저에 열어둔 동안, 지정한 분 간격마다 자동으로 실행됩니다. 앱을 닫으면 멈춥니다 — 진짜
                서버 크론이 아닙니다.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="mine" className="flex-col">
        <TabsList variant="line">
          <TabsTrigger value="mine">내 자동화{automations.length > 0 ? ` (${automations.length})` : ""}</TabsTrigger>
          <TabsTrigger value="templates">템플릿</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4 pt-4">
          <p className="text-sm text-text-secondary">
            아래 템플릿 중 하나를 추가하면 &ldquo;내 자동화&rdquo; 탭에 바로 나타납니다. 추가한 뒤에도 자유롭게
            수정·삭제할 수 있습니다.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {AUTOMATION_TEMPLATES.map((template) => {
              const Icon = CATEGORY_ICON[template.category];
              return (
                <Card key={template.id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-center gap-2">
                    <Icon className="size-3.5 text-text-secondary" />
                    <span className="text-xs text-text-secondary">{template.categoryLabel}</span>
                    <span className="text-xs text-text-secondary">
                      · {template.triggerType === "manual" ? "수동 실행" : `${template.intervalMinutes}분마다`}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-foreground">{template.name}</div>
                  <p className="text-xs text-text-secondary">{template.description}</p>
                  <p className="text-xs italic text-text-secondary">언제 쓰나요? {template.useCase}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-text-secondary">{PROVIDER_LABELS[template.provider]}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleAddTemplate(template)}
                      disabled={addingTemplateId === template.id}
                    >
                      <Plus className="size-3.5" /> {addingTemplateId === template.id ? "추가 중..." : "추가"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="mine" className="space-y-6 pt-4">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowCustomForm((v) => !v)}
              className="text-sm font-medium text-foreground hover:text-text-secondary"
            >
              {showCustomForm ? "직접 만들기 접기 ▾" : "직접 만들기 ▸"}
            </button>
            {showCustomForm && (
              <Card className="space-y-3 p-4">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="자동화 이름" />
                <Textarea
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  placeholder="실행할 프롬프트..."
                  className="min-h-20"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    value={provider}
                    onValueChange={(v) => {
                      setProvider(v as ProviderId);
                      setModel("");
                    }}
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
                  <Select value={model} onValueChange={(v) => setModel(v as string)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(v: string) => modelOptions.find((m) => m.id === v)?.label ?? "모델 선택"}
                      </SelectValue>
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
                <div className="grid grid-cols-2 gap-3">
                  <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v: string) => (v === "manual" ? "수동 실행" : "간격 실행")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">수동 실행</SelectItem>
                      <SelectItem value="interval">간격 실행 (앱이 열려 있는 동안)</SelectItem>
                    </SelectContent>
                  </Select>
                  {triggerType === "interval" && (
                    <Input
                      type="number"
                      min={5}
                      value={intervalMinutes}
                      onChange={(e) => setIntervalMinutes(Number(e.target.value) || 60)}
                      placeholder="간격 (분)"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={outputType} onValueChange={(v) => setOutputType(v as AutomationOutputType)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(v: string) => (v === "text" ? "텍스트로 기록" : "코드 파일로 저장")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">텍스트로 기록</SelectItem>
                      <SelectItem value="code">코드 파일로 저장</SelectItem>
                    </SelectContent>
                  </Select>
                  {outputType === "code" && (
                    <Input
                      value={filename}
                      onChange={(e) => setFilename(e.target.value)}
                      placeholder="파일 이름 (비우면 자동 생성)"
                    />
                  )}
                </div>
                {outputType === "code" && (
                  <p className="text-xs text-text-secondary">
                    응답에서 첫 번째 코드 블록을 추출해 언어에 맞는 확장자로 파일 페이지에 저장합니다. 코드 블록이
                    없으면 전체 응답을 .md 파일로 저장합니다.
                  </p>
                )}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleCreate()}
                    disabled={saving || !name.trim() || !promptTemplate.trim() || !model}
                  >
                    저장
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }, (_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : automations.length === 0 ? (
            <p className="text-sm text-text-secondary">
              아직 저장된 자동화가 없습니다. &ldquo;템플릿&rdquo; 탭에서 하나를 추가하거나 직접 만들어보세요.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <div className="text-xs font-medium tracking-wide text-text-secondary">
                    {CATEGORY_LABEL[category as AutomationCategory] ?? category}
                  </div>
                  {items.map((automation) => (
                    <Card key={automation.id} className="flex items-center gap-3 p-4">
                      <ProviderMark provider={automation.provider} size="sm" />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground">{automation.name}</span>
                          {automation.outputType === "code" ? (
                            <Code2 className="size-3 text-text-secondary" />
                          ) : (
                            <FileText className="size-3 text-text-secondary" />
                          )}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {automation.triggerType === "manual" ? "수동 실행" : `${automation.intervalMinutes}분마다`}{" "}
                          · 마지막 실행: {formatRelativeTimeKo(automation.lastRunAt)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleRun(automation.id)}
                        disabled={runningId === automation.id}
                      >
                        <Play className="size-3.5" /> {runningId === automation.id ? "실행 중..." : "지금 실행"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(automation.id)}
                        className="text-text-secondary hover:text-danger"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
