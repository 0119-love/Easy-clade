"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Code2, Languages, PenLine, Play, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderMark } from "@/components/ui/provider-mark";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PROVIDER_IDS, PROVIDER_LABELS, type ProviderId } from "@/lib/config/types";
import type { ModelInfo } from "@/lib/providers/types";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import {
  createAgentPreset,
  deleteAgentPresetRemote,
  fetchAgentPresets,
  type AgentCategory,
  type AgentPresetRow,
} from "@/lib/agents/client";
import { AGENT_TEMPLATES } from "@/lib/agents/templates";

interface ModelsResponse {
  models: Record<string, ModelInfo[]>;
}

async function fetchModels(): Promise<ModelsResponse> {
  const res = await fetch("/api/models");
  if (!res.ok) throw new Error("모델 목록을 불러오지 못했습니다.");
  return res.json();
}

const CATEGORY_ICON: Record<AgentCategory, typeof Code2> = {
  code: Code2,
  writing: PenLine,
  translation: Languages,
  research: Search,
  custom: Sparkles,
};

const CATEGORY_LABEL: Record<AgentCategory, string> = {
  code: "코드",
  writing: "글쓰기",
  translation: "번역",
  research: "리서치",
  custom: "직접 만든 것",
};

export default function AgentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const applyPreset = useDashboardStore((s) => s.applyPreset);
  const { data, isPending } = useQuery({ queryKey: ["agents"], queryFn: fetchAgentPresets });
  const { data: modelsData } = useQuery({ queryKey: ["models"], queryFn: fetchModels });

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<ProviderId>("anthropic");
  const [model, setModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingTemplateId, setAddingTemplateId] = useState<string | null>(null);

  const modelOptions = modelsData?.models[provider] ?? [];

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["agents"] });
  }

  async function handleCreate() {
    if (!name.trim() || !model) return;
    setSaving(true);
    try {
      await createAgentPreset({
        name: name.trim(),
        provider,
        model,
        systemPrompt: systemPrompt.trim() || null,
        temperature: 1,
        effort: "medium",
        description: description.trim() || null,
        category: "custom",
      });
      setName("");
      setSystemPrompt("");
      setDescription("");
      refresh();
      toast.success("에이전트가 저장되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "에이전트를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTemplate(template: (typeof AGENT_TEMPLATES)[number]) {
    const options = modelsData?.models[template.provider] ?? [];
    if (options.length === 0) {
      toast.error("모델 목록을 아직 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setAddingTemplateId(template.id);
    try {
      await createAgentPreset({
        name: template.name,
        provider: template.provider,
        model: options[0].id,
        systemPrompt: template.systemPrompt,
        temperature: 1,
        effort: "medium",
        description: template.description,
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
      await deleteAgentPresetRemote(id);
      refresh();
      toast.success("에이전트가 삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "에이전트를 삭제하지 못했습니다.");
    }
  }

  function handleRun(preset: AgentPresetRow) {
    applyPreset(preset);
    toast.success(`"${preset.name}"을(를) 대시보드에 불러왔습니다. 이제 프롬프트만 입력하고 실행하세요.`);
    router.push("/app");
  }

  const presets = data?.presets ?? [];
  const grouped = presets.reduce<Record<string, AgentPresetRow[]>>((acc, preset) => {
    (acc[preset.category] ??= []).push(preset);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl space-y-8 px-10 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">에이전트</h1>
        <p className="text-sm text-text-secondary">
          모델·시스템 프롬프트·역할을 하나로 묶어 저장해두는 &ldquo;저장된 설정&rdquo;입니다. 도구를 스스로 쓰거나
          여러 단계를 자율적으로 수행하는 자율 에이전트가 아니라, 매번 프롬프트를 새로 설명하지 않도록 미리 만들어둔
          역할 프리셋이라고 생각하면 됩니다.
        </p>
      </div>

      <Card className="space-y-3 p-4">
        <div className="text-xs font-medium tracking-wide text-text-secondary">사용 방법 · 3단계</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">1. 저장</div>
            <p className="text-xs text-text-secondary">
              아래 템플릿을 추가하거나, 원하는 역할·모델·시스템 프롬프트를 직접 만들어 저장합니다.
            </p>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">2. 실행 클릭</div>
            <p className="text-xs text-text-secondary">
              목록에서 &ldquo;실행&rdquo;을 누르면 대시보드로 이동하며 설정이 자동으로 채워집니다.
            </p>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">3. 프롬프트만 입력</div>
            <p className="text-xs text-text-secondary">
              모델·시스템 프롬프트는 이미 채워져 있으니, 그때그때 하고 싶은 말만 입력하고 실행하면 됩니다.
            </p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="mine" className="flex-col">
        <TabsList variant="line">
          <TabsTrigger value="mine">내 에이전트{presets.length > 0 ? ` (${presets.length})` : ""}</TabsTrigger>
          <TabsTrigger value="templates">템플릿</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4 pt-4">
          <p className="text-sm text-text-secondary">
            아래 템플릿 중 하나를 추가하면 &ldquo;내 에이전트&rdquo; 탭에 바로 나타납니다. 추가한 뒤에도 자유롭게
            수정·삭제할 수 있습니다.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {AGENT_TEMPLATES.map((template) => {
              const Icon = CATEGORY_ICON[template.category];
              return (
                <Card key={template.id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-center gap-2">
                    <Icon className="size-3.5 text-text-secondary" />
                    <span className="text-xs text-text-secondary">{template.categoryLabel}</span>
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
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="에이전트 이름" />
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
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="시스템 프롬프트 (선택) — 이 에이전트가 어떤 역할을 해야 하는지 설명하세요"
                  className="min-h-16"
                />
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="설명 (선택)"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleCreate()}
                    disabled={saving || !name.trim() || !model}
                  >
                    저장
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : presets.length === 0 ? (
            <p className="text-sm text-text-secondary">
              아직 저장된 에이전트가 없습니다. &ldquo;템플릿&rdquo; 탭에서 하나를 추가하거나 직접 만들어보세요.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <div className="text-xs font-medium tracking-wide text-text-secondary">
                    {CATEGORY_LABEL[category as AgentCategory] ?? category}
                  </div>
                  {items.map((preset) => (
                    <Card key={preset.id} className="flex items-center gap-3 p-4">
                      <ProviderMark provider={preset.provider} size="sm" />
                      <div className="flex-1 space-y-0.5">
                        <div className="text-sm font-medium text-foreground">{preset.name}</div>
                        <div className="text-xs text-text-secondary">
                          {PROVIDER_LABELS[preset.provider]} · {preset.model}
                          {preset.description ? ` · ${preset.description}` : ""}
                        </div>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => handleRun(preset)}>
                        <Play className="size-3.5" /> 실행
                      </Button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(preset.id)}
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
