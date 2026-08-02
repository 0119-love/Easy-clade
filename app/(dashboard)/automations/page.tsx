"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clock,
  Code2,
  FileText,
  MousePointerClick,
  Play,
  Plus,
  Trash2,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  Settings2,
  X,
} from "lucide-react";
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
  createAutomation,
  deleteAutomationRemote,
  fetchAutomations,
  runAutomationRemote,
  type AutomationOutputType,
  type AutomationRow,
  type TriggerType,
} from "@/lib/automations/client";
import {
  AUTOMATION_TEMPLATES,
  AUTOMATION_HUB_SYSTEMS,
  type AutomationHubSystem,
  type AutomationTemplate,
} from "@/lib/automations/templates";
import { fileUrl } from "@/lib/files/client";
import { formatRelativeTimeKo } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";

interface ModelsResponse {
  models: Record<string, ModelInfo[]>;
}

async function fetchModels(): Promise<ModelsResponse> {
  const res = await fetch("/api/models");
  if (!res.ok) throw new Error("모델 목록을 불러오지 못했습니다.");
  return res.json();
}

export default function AutomationsPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["automations"], queryFn: fetchAutomations });
  const { data: modelsData } = useQuery({ queryKey: ["models"], queryFn: fetchModels });

  // Hub state: which system is selected, which template is open
  const [selectedSystem, setSelectedSystem] = useState<AutomationHubSystem | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<AutomationTemplate | null>(null);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [addingTemplateId, setAddingTemplateId] = useState<string | null>(null);
  const [runningTemplateId, setRunningTemplateId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<string | null>(null);

  // My automations tab
  const [showMyAutomations, setShowMyAutomations] = useState(false);

  const automations = data?.automations ?? [];

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["automations"] });
  }

  function openTemplate(template: AutomationTemplate) {
    setActiveTemplate(template);
    setEditedPrompt(template.promptTemplate);
    setIntervalMinutes(template.intervalMinutes ?? 60);
    setRunResult(null);
  }

  function closeTemplate() {
    setActiveTemplate(null);
    setRunResult(null);
  }

  async function handleAddToMine(template: AutomationTemplate) {
    const options = modelsData?.models[template.provider] ?? [];
    if (options.length === 0) {
      toast.error("모델 목록을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setAddingTemplateId(template.id);
    try {
      await createAutomation({
        name: template.name,
        promptTemplate: editedPrompt || template.promptTemplate,
        provider: template.provider,
        model: options[0].id,
        triggerType: template.triggerType,
        intervalMinutes: template.triggerType === "interval" ? intervalMinutes : null,
        outputType: template.outputType,
        filename: null,
        category: template.category,
      });
      refresh();
      toast.success(`"${template.name}" 자동화가 저장되었습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "자동화를 저장하지 못했습니다.");
    } finally {
      setAddingTemplateId(null);
    }
  }

  async function handleRunTemplate(template: AutomationTemplate) {
    const options = modelsData?.models[template.provider] ?? [];
    if (options.length === 0) {
      toast.error("모델 목록을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setRunningTemplateId(template.id);
    setRunResult(null);
    try {
      // Save temporarily then run
      const created = await createAutomation({
        name: template.name + " (임시 실행)",
        promptTemplate: editedPrompt || template.promptTemplate,
        provider: template.provider,
        model: options[0].id,
        triggerType: "manual",
        intervalMinutes: null,
        outputType: template.outputType,
        filename: null,
        category: template.category,
      });
      refresh();
      const result = await runAutomationRemote(created.id);
      if (result.status === "error") {
        toast.error(result.errorMessage ?? "실행에 실패했습니다.");
        setRunResult("❌ 실행 오류: " + (result.errorMessage ?? "알 수 없는 오류"));
      } else if (result.file) {
        const file = result.file;
        toast.success(`파일 "${file.filename}"이 생성되었습니다.`, {
          action: { label: "열기", onClick: () => window.open(fileUrl(file.id), "_blank") },
        });
        setRunResult(`✅ 코드 파일 생성 완료: ${file.filename}`);
        void queryClient.invalidateQueries({ queryKey: ["files"] });
      } else if (result.responseText) {
        setRunResult(result.responseText);
        toast.success("실행 완료! 아래에서 결과를 확인하세요.");
      } else {
        toast.success("실행이 완료되었습니다.");
        setRunResult("✅ 실행 완료");
      }
      // Clean up temp automation
      await deleteAutomationRemote(created.id);
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["history"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "실행에 실패했습니다.");
    } finally {
      setRunningTemplateId(null);
    }
  }

  async function handleDeleteMyAutomation(id: number) {
    try {
      await deleteAutomationRemote(id);
      refresh();
      toast.success("자동화가 삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  async function handleRunMyAutomation(id: number) {
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

  const systemTemplates = selectedSystem
    ? AUTOMATION_TEMPLATES.filter((t) => selectedSystem.templateIds.includes(t.id))
    : [];

  return (
    <div className="min-h-screen px-6 py-8 max-w-[1400px] mx-auto space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-border/40 pb-5">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">자동화</h1>
          <p className="mt-1 text-sm text-text-secondary">
            5대 핵심 AI 자동화 시스템으로 반복 업무를 제거하고 생산성을 극대화하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowMyAutomations((v) => !v)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-all",
            showMyAutomations
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
              : "border-border/60 bg-card/60 text-text-secondary hover:text-foreground"
          )}
        >
          <Settings2 className="size-4" />
          내 자동화{automations.length > 0 ? ` (${automations.length})` : ""}
        </button>
      </div>

      {/* ── My Automations Panel (collapsible) ── */}
      {showMyAutomations && (
        <div className="rounded-xl border border-border/60 bg-card/60 p-5 space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-400" />
            저장된 내 자동화
          </h2>
          {isPending ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : automations.length === 0 ? (
            <p className="text-sm text-text-secondary">아직 저장된 자동화가 없습니다. 아래 허브에서 자동화를 추가해 보세요.</p>
          ) : (
            <div className="space-y-2">
              {automations.map((automation) => (
                <Card key={automation.id} className="flex items-center gap-3 p-3">
                  <ProviderMark provider={automation.provider} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground truncate">{automation.name}</span>
                      {automation.outputType === "code" ? (
                        <Code2 className="size-3 text-text-secondary shrink-0" />
                      ) : (
                        <FileText className="size-3 text-text-secondary shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {automation.triggerType === "manual" ? "수동 실행" : `${automation.intervalMinutes}분마다`}
                      {" · "}마지막 실행: {formatRelativeTimeKo(automation.lastRunAt)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleRunMyAutomation(automation.id)}
                    disabled={runningId === automation.id}
                  >
                    {runningId === automation.id ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                    {runningId === automation.id ? "실행 중..." : "지금 실행"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteMyAutomation(automation.id)}
                    className="text-text-secondary hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 5대 Hub System Cards ── */}
      {!selectedSystem && !activeTemplate && (
        <>
          <div className="text-center space-y-2 py-4">
            <h2 className="text-xl font-bold text-foreground">5대 핵심 자동화 시스템</h2>
            <p className="text-sm text-text-secondary">원하는 자동화 유형을 선택하면 세부 메뉴가 나타납니다.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {AUTOMATION_HUB_SYSTEMS.map((sys) => (
              <button
                key={sys.id}
                type="button"
                onClick={() => {
                  setSelectedSystem(sys);
                  setActiveTemplate(null);
                  setRunResult(null);
                }}
                className={cn(
                  "group flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center transition-all duration-200 hover:scale-[1.03] hover:shadow-xl",
                  sys.borderColor,
                  sys.bgColor
                )}
              >
                <span className="text-4xl">{sys.icon}</span>
                <span className={cn("text-sm font-bold", sys.color)}>{sys.name}</span>
                <p className="text-[11px] text-text-secondary leading-relaxed">{sys.description}</p>
                <div className={cn("flex items-center gap-1 text-[11px] font-semibold mt-1", sys.color)}>
                  <span>{sys.templateIds.length}개 자동화 포함</span>
                  <ChevronRight className="size-3" />
                </div>
              </button>
            ))}
          </div>

          {/* How it works */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {[
              { icon: "1️⃣", title: "시스템 선택", desc: "위 5개 자동화 카테고리 중 필요한 것을 클릭합니다." },
              { icon: "2️⃣", title: "세부 자동화 선택 & 편집", desc: "자동화 세부 종류를 선택하고 프롬프트를 수정합니다." },
              { icon: "3️⃣", title: "즉시 실행 또는 저장", desc: "바로 실행하거나 내 자동화에 저장해 반복 사용합니다." },
            ].map((step) => (
              <div key={step.title} className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/40 p-4">
                <span className="text-2xl">{step.icon}</span>
                <div>
                  <div className="text-sm font-bold text-foreground">{step.title}</div>
                  <div className="mt-0.5 text-xs text-text-secondary leading-relaxed">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── System Selected: Template List ── */}
      {selectedSystem && !activeTemplate && (
        <div className="space-y-6">
          {/* Back + System Header */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedSystem(null)}
              className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-xs font-semibold text-text-secondary hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              전체 시스템
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selectedSystem.icon}</span>
              <div>
                <h2 className={cn("text-lg font-extrabold", selectedSystem.color)}>{selectedSystem.name}</h2>
                <p className="text-xs text-text-secondary">{selectedSystem.description}</p>
              </div>
            </div>
          </div>

          {/* Template Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => openTemplate(template)}
                className={cn(
                  "group flex flex-col justify-between rounded-xl border p-5 text-left transition-all duration-200 hover:scale-[1.01] hover:shadow-lg",
                  selectedSystem.borderColor,
                  selectedSystem.bgColor
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs font-bold uppercase tracking-wider", selectedSystem.color)}>
                      {template.triggerType === "interval" ? `⏱ ${template.intervalMinutes}분마다 자동` : "⚡ 수동 실행"}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold border", selectedSystem.borderColor, selectedSystem.color)}>
                      {template.outputType === "code" ? "📄 코드 파일" : "📝 텍스트"}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{template.name}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{template.description}</p>
                  <p className="text-xs text-text-secondary/70 italic">💡 {template.useCase}</p>
                </div>

                <div className={cn("mt-4 flex items-center justify-between border-t pt-3 text-[11px] font-semibold", selectedSystem.borderColor, selectedSystem.color)}>
                  <span className="flex items-center gap-1.5">
                    <ProviderMark provider={template.provider} size="sm" />
                    {PROVIDER_LABELS[template.provider]}
                  </span>
                  <span className="flex items-center gap-1">
                    실행 & 설정 <ChevronRight className="size-3" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Template Console: Active Template ── */}
      {activeTemplate && (
        <div className="space-y-6">
          {/* Breadcrumb navigation */}
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <button
              type="button"
              onClick={() => { setActiveTemplate(null); setRunResult(null); }}
              className="hover:text-foreground font-medium transition-colors"
            >
              {selectedSystem?.icon} {selectedSystem?.name}
            </button>
            <ChevronRight className="size-3" />
            <span className="font-bold text-foreground">{activeTemplate.name}</span>
            <button
              type="button"
              onClick={closeTemplate}
              className="ml-auto rounded-lg border border-border/60 bg-card/60 p-1.5 text-text-secondary hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Console Panel */}
          <div className={cn("rounded-2xl border p-6 space-y-5", selectedSystem?.borderColor, selectedSystem?.bgColor)}>
            {/* Template info header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-foreground">{activeTemplate.name}</h2>
                <p className="mt-1 text-xs text-text-secondary">{activeTemplate.description}</p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <ProviderMark provider={activeTemplate.provider} size="sm" />
                    {PROVIDER_LABELS[activeTemplate.provider]}
                  </span>
                  <span>·</span>
                  <span>{activeTemplate.outputType === "code" ? "📄 코드 파일 생성" : "📝 텍스트 출력"}</span>
                  <span>·</span>
                  <span>{activeTemplate.triggerType === "interval" ? "⏱ 주기 실행" : "⚡ 수동 실행"}</span>
                </div>
              </div>
            </div>

            {/* Prompt Editor */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Sparkles className="size-4 text-amber-400" />
                실행 프롬프트 (자유롭게 편집 가능)
              </label>
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-border/80 bg-background/80 p-4 text-sm font-mono text-foreground placeholder:text-text-secondary focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 resize-y transition-all"
              />
            </div>

            {/* Interval setting if applicable */}
            {activeTemplate.triggerType === "interval" && (
              <div className="flex items-center gap-3">
                <Clock className="size-4 text-text-secondary" />
                <span className="text-xs text-text-secondary">실행 간격:</span>
                <Input
                  type="number"
                  min={5}
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Number(e.target.value) || 60)}
                  className="w-24 text-sm"
                />
                <span className="text-xs text-text-secondary">분마다</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => void handleRunTemplate(activeTemplate)}
                disabled={runningTemplateId === activeTemplate.id}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-60"
              >
                {runningTemplateId === activeTemplate.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                {runningTemplateId === activeTemplate.id ? "실행 중..." : "⚡ 지금 즉시 실행"}
              </button>

              <button
                type="button"
                onClick={() => void handleAddToMine(activeTemplate)}
                disabled={addingTemplateId === activeTemplate.id}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/60 px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-secondary active:scale-95 disabled:opacity-60"
              >
                {addingTemplateId === activeTemplate.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {addingTemplateId === activeTemplate.id ? "저장 중..." : "내 자동화에 저장"}
              </button>

              <span className="text-xs text-text-secondary">
                💡 저장하면 상단 &apos;내 자동화&apos; 에서 언제든 다시 실행할 수 있습니다.
              </span>
            </div>
          </div>

          {/* Result Output Panel */}
          {(runningTemplateId === activeTemplate.id || runResult) && (
            <div className="rounded-xl border border-border/60 bg-card/60 p-5 space-y-3">
              <div className="flex items-center gap-2">
                {runningTemplateId === activeTemplate.id ? (
                  <>
                    <Loader2 className="size-4 text-emerald-400 animate-spin" />
                    <span className="text-sm font-bold text-foreground">AI 자동화 실행 중...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span className="text-sm font-bold text-foreground">실행 결과</span>
                  </>
                )}
              </div>
              {runResult && (
                <div className="rounded-lg border border-border/40 bg-background/60 p-4 text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                  {runResult}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
