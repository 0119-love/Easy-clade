"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  Loader2,
  Lock,
  Play,
  Scale,
  Shuffle,
  Sparkles,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProviderMark } from "@/components/ui/provider-mark";
import { PROVIDER_IDS, PROVIDER_LABELS, type KeysStatusResponse, type ProviderId } from "@/lib/config/types";
import { useDashboardStore, type JudgeMode } from "@/lib/store/dashboardStore";
import { runProvider } from "@/lib/streamClient";
import { autoRoute } from "@/lib/routing/autoRoute";
import { fetchFiles, fileUrl, isImageMime } from "@/lib/files/client";

interface PromptComposerProps {
  keysStatus: KeysStatusResponse | undefined;
  activeProviders: ProviderId[];
}

const SAMPLE_PROMPTS = [
  { label: "⚡ 요약 & 핵심 추출", text: "다음 문장의 핵심 내용을 3가지 항목으로 간결하게 요약해 줘." },
  { label: "💡 코드 최적화", text: "이 코드의 실행 속도와 메모리 사용량을 최적화하고 리팩토링해 줘." },
  { label: "👑 다중 AI 아키텍처 비교", text: "Next.js 16과 React 19 기반의 확장 가능한 웹 애플리케이션 구조를 비교 분석해 줘." },
];

type Accent = "indigo" | "amber" | "emerald";

const ACCENT_CLASSES: Record<Accent, { icon: string; ring: string; badge: string; footerBorder: string; footerText: string }> = {
  indigo: {
    icon: "bg-indigo-500/20 text-indigo-400",
    ring: "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500",
    badge: "bg-indigo-500/20 text-indigo-400",
    footerBorder: "border-indigo-500/10",
    footerText: "text-indigo-400",
  },
  amber: {
    icon: "bg-amber-500/20 text-amber-400",
    ring: "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500",
    badge: "bg-amber-500/20 text-amber-400",
    footerBorder: "border-amber-500/10",
    footerText: "text-amber-400",
  },
  emerald: {
    icon: "bg-emerald-500/20 text-emerald-400",
    ring: "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500",
    badge: "bg-emerald-500/20 text-emerald-400",
    footerBorder: "border-emerald-500/10",
    footerText: "text-emerald-400",
  },
};

interface ModeCard {
  value: JudgeMode;
  icon: LucideIcon;
  title: string;
  description: string;
  badge: string;
  footer: string;
  accent: Accent;
}

// Same three modes the old dropdown (ModeSelector) offered -- only the
// presentation changed, not the underlying judge/consensus/auto-route logic.
const MODE_CARDS: ModeCard[] = [
  {
    value: "consensus",
    icon: Scale,
    title: "합의 판정",
    description: "실행된 모든 응답을 비교해 공통된 결론과 차이점을 정리합니다.",
    badge: "Cross-Check",
    footer: "응답 교차 비교",
    accent: "indigo",
  },
  {
    value: "best_answer",
    icon: Trophy,
    title: "최선의 답변",
    description: "여러 모델의 응답 중 가장 우수한 답변 하나를 선정합니다.",
    badge: "Best Pick",
    footer: "최고 답변 선정",
    accent: "amber",
  },
  {
    value: "auto_route",
    icon: Shuffle,
    title: "자동 라우팅",
    description: "프롬프트 내용에 가장 적합한 모델 하나에 자동으로 전달합니다.",
    badge: "Auto Route",
    footer: "자동 모델 매칭",
    accent: "emerald",
  },
];

export function PromptComposer({ keysStatus, activeProviders }: PromptComposerProps) {
  const systemPrompt = useDashboardStore((s) => s.systemPrompt);
  const userPrompt = useDashboardStore((s) => s.userPrompt);
  const maxTokens = useDashboardStore((s) => s.maxTokens);
  const cards = useDashboardStore((s) => s.cards);
  const consensus = useDashboardStore((s) => s.consensus);
  const judgeMode = useDashboardStore((s) => s.judgeMode);
  const setSystemPrompt = useDashboardStore((s) => s.setSystemPrompt);
  const setUserPrompt = useDashboardStore((s) => s.setUserPrompt);
  const setMaxTokens = useDashboardStore((s) => s.setMaxTokens);
  const setJudgeMode = useDashboardStore((s) => s.setJudgeMode);
  const startConsensus = useDashboardStore((s) => s.startConsensus);
  const finishConsensus = useDashboardStore((s) => s.finishConsensus);
  const failConsensus = useDashboardStore((s) => s.failConsensus);
  const currentProjectId = useDashboardStore((s) => s.currentProjectId);
  const attachmentFileIds = useDashboardStore((s) => s.attachmentFileIds);
  const toggleAttachmentFileId = useDashboardStore((s) => s.toggleAttachmentFileId);

  const [routeReason, setRouteReason] = useState<string | null>(null);
  const { data: filesData } = useQuery({ queryKey: ["files"], queryFn: fetchFiles });
  const imageFiles = useMemo(() => filesData?.files.filter((f) => isImageMime(f.mimeType)) ?? [], [filesData]);
  const attachedFiles = useMemo(
    () => imageFiles.filter((f) => attachmentFileIds.includes(f.id)),
    [imageFiles, attachmentFileIds],
  );

  const configuredProviders = useMemo(
    () => activeProviders.filter((id) => keysStatus?.providers[id]?.configured),
    [activeProviders, keysStatus],
  );

  // Which of the configured providers actually take part in the next run --
  // a subset the user narrows down via the provider grid below, separate
  // from `activeProviders` (the broader onboarding-level provider list).
  const [selectedProviders, setSelectedProviders] = useState<ProviderId[]>([]);
  const didInitSelection = useRef(false);
  useEffect(() => {
    if (didInitSelection.current || configuredProviders.length === 0) return;
    didInitSelection.current = true;
    setSelectedProviders(configuredProviders);
  }, [configuredProviders]);

  const anyRunning = PROVIDER_IDS.some((id) => cards[id].status === "running");
  const judging = consensus.status === "running";

  function toggleProvider(id: ProviderId) {
    if (!configuredProviders.includes(id)) {
      toast.error(`${PROVIDER_LABELS[id]}의 API 키가 등록되지 않았습니다. 설정에서 키를 등록해 주세요.`);
      return;
    }
    setSelectedProviders((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) {
          toast.warning("최소 1개 이상의 AI 프로바이더를 선택해야 합니다.");
          return prev;
        }
        return prev.filter((p) => p !== id);
      }
      return [...prev, id];
    });
  }

  function routeAutomatically() {
    if (!userPrompt.trim() || !keysStatus || selectedProviders.length === 0) return;
    // Only ever route within the providers selected in the grid -- the rule
    // engine itself doesn't take a candidate set, so this narrows what it
    // sees as "configured" instead of restricting its output after the fact.
    const restrictedKeysStatus: KeysStatusResponse = {
      ...keysStatus,
      providers: Object.fromEntries(
        PROVIDER_IDS.map((id) => [
          id,
          { ...keysStatus.providers[id], configured: selectedProviders.includes(id) && Boolean(keysStatus.providers[id]?.configured) },
        ]),
      ) as KeysStatusResponse["providers"],
    };
    const decision = autoRoute(userPrompt, restrictedKeysStatus, selectedProviders[0]);
    setRouteReason(decision.reason);
    toast.info(decision.reason);
    void runProvider({
      provider: decision.provider,
      model: cards[decision.provider].model,
      systemPrompt: systemPrompt || undefined,
      userPrompt,
      temperature: cards[decision.provider].temperature,
      maxTokens,
      effort: cards[decision.provider].effort,
      runGroupId: crypto.randomUUID(),
      projectId: currentProjectId,
      attachmentFileIds,
    });
  }

  function handleExecute() {
    if (judgeMode === "auto_route") {
      routeAutomatically();
    } else {
      void runAllThenJudge(judgeMode);
    }
  }

  const executeDisabled = anyRunning || judging || !userPrompt.trim() || selectedProviders.length === 0;

  /**
   * Consensus/best-answer used to only judge whatever was already sitting in
   * the cards -- if you hadn't separately pressed the page header's "전체
   * 실행" first, clicking this button just failed with a "run 2+ models
   * first" error. This runs every selected provider on the current prompt,
   * waits for them to land, then judges -- one click end to end.
   */
  async function runAllThenJudge(mode: "consensus" | "best_answer") {
    const runGroupId = crypto.randomUUID();
    const cardsAtLaunch = useDashboardStore.getState().cards;
    await Promise.all(
      selectedProviders.map((provider) =>
        runProvider({
          provider,
          model: cardsAtLaunch[provider].model,
          systemPrompt: systemPrompt || undefined,
          userPrompt,
          temperature: cardsAtLaunch[provider].temperature,
          maxTokens,
          effort: cardsAtLaunch[provider].effort,
          runGroupId,
          projectId: currentProjectId,
          attachmentFileIds,
        }),
      ),
    );
    await judge(mode);
  }

  async function judge(mode: "consensus" | "best_answer") {
    // Re-read from the store rather than the `cards` closed over at render
    // time -- runAllThenJudge just awaited fresh runs, and this component
    // hasn't necessarily re-rendered with that result yet.
    const latestCards = useDashboardStore.getState().cards;
    const responses = selectedProviders
      .filter((id) => latestCards[id].status === "done" && latestCards[id].streamedText)
      .map((id) => ({ provider: id, model: latestCards[id].model, text: latestCards[id].streamedText }));
    if (responses.length < 2) {
      toast.error("채점하려면 최소 두 개 모델이 성공적으로 응답해야 합니다.");
      return;
    }
    startConsensus(mode);
    try {
      const res = await fetch("/api/consensus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runGroupId: crypto.randomUUID(), mode, responses }),
      });
      const data = (await res.json()) as { resultText?: string; error?: string };
      if (data.error) {
        failConsensus(data.error);
      } else {
        finishConsensus(data.resultText ?? "");
      }
    } catch (err) {
      failConsensus(err instanceof Error ? err.message : "알 수 없는 오류");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Accordion>
        <AccordionItem value="advanced" className="border-none">
          <AccordionTrigger className="w-fit py-0 text-xs text-text-secondary hover:no-underline">
            고급 옵션
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pt-3 sm:grid-cols-[1fr_140px]">
              <div className="space-y-1.5">
                <Label htmlFor="system-prompt" className="text-xs text-text-secondary">
                  시스템 프롬프트
                </Label>
                <Input
                  id="system-prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="당신은 유용한 어시스턴트입니다..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-tokens" className="text-xs text-text-secondary">
                  최대 토큰
                </Label>
                <Input
                  id="max-tokens"
                  type="number"
                  min={256}
                  max={128_000}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value) || 4096)}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Provider selector grid -- narrows which of the active providers this run actually uses. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Layers className="size-4 text-emerald-400" />
            조합할 AI 모델 선택 (API 키 저장된 AI만 클릭 가능)
          </label>
          <span className="text-[11px] text-text-secondary">
            선택됨: <span className="font-bold text-emerald-400">{selectedProviders.length}개 AI</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {activeProviders.map((provider) => {
            const isConfigured = configuredProviders.includes(provider);
            const isSelected = selectedProviders.includes(provider);

            return (
              <button
                key={provider}
                type="button"
                onClick={() => toggleProvider(provider)}
                disabled={!keysStatus}
                className={`relative flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all duration-200 ${
                  isConfigured
                    ? isSelected
                      ? "cursor-pointer border-emerald-500 bg-emerald-500/10 text-foreground shadow-md ring-1 ring-emerald-500"
                      : "cursor-pointer border-border/80 bg-card/60 text-text-secondary hover:border-emerald-500/50 hover:bg-card"
                    : "cursor-not-allowed border-border/40 bg-secondary/20 text-zinc-500 opacity-60"
                }`}
              >
                <div className="absolute top-2 right-2">
                  {isConfigured ? (
                    isSelected ? (
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                    ) : (
                      <div className="size-2 rounded-full bg-emerald-500/40" />
                    )
                  ) : (
                    <Lock className="size-3 text-zinc-500" />
                  )}
                </div>

                <ProviderMark provider={provider} size="default" className="mb-2" />
                <span className="text-xs font-bold leading-tight">{PROVIDER_LABELS[provider]}</span>
                <span className="mt-0.5 max-w-full truncate text-[9.5px] text-text-secondary">{cards[provider].model}</span>

                <span
                  className={`mt-2 rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                    isConfigured
                      ? isSelected
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-secondary text-text-secondary"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {isConfigured ? (isSelected ? "조합 포함됨" : "선택 가능") : "키 미등록"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode cards -- same consensus/best-answer/auto-route modes the old dropdown offered. */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {MODE_CARDS.map((option) => {
          const Icon = option.icon;
          const selected = judgeMode === option.value;
          const accent = ACCENT_CLASSES[option.accent];
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setJudgeMode(option.value)}
              disabled={anyRunning || judging}
              className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 ${
                selected ? accent.ring : "border-border/60 bg-card/60 hover:border-border hover:bg-card"
              }`}
            >
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`flex size-7 items-center justify-center rounded-lg ${accent.icon}`}>
                      <Icon className="size-4" />
                    </div>
                    <span className="text-sm font-bold text-foreground">{option.title}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${accent.badge}`}>{option.badge}</span>
                </div>
                <p className="text-xs leading-relaxed text-text-secondary">{option.description}</p>
              </div>
              <div className={`mt-3 flex items-center justify-between border-t pt-2.5 text-[11px] font-medium ${accent.footerBorder} ${accent.footerText}`}>
                <span>{option.footer}</span>
                <ArrowRight className="size-3" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Prompt box */}
      <div className="space-y-4 rounded-xl border border-border/80 bg-card/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Sparkles className="size-4 text-emerald-400" />
            AI 프롬프트 작성
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="shrink-0 text-[11px] text-text-secondary">샘플 질문:</span>
            {SAMPLE_PROMPTS.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => setUserPrompt(sample.text)}
                className="shrink-0 rounded-full border border-border/60 bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-secondary hover:text-foreground"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {attachedFiles.map((file) => (
              <span key={file.id} className="glass-chip flex items-center gap-1.5 rounded-full px-2 py-1 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element -- local file server route, not a static asset */}
                <img src={fileUrl(file.id)} alt={file.filename} className="size-4 rounded object-cover" />
                <span className="max-w-24 truncate text-foreground">{file.filename}</span>
                <button type="button" onClick={() => toggleAttachmentFileId(file.id)} className="text-text-secondary hover:text-danger">
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <Textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleExecute();
          }}
          placeholder="세 모델에게 무엇이든 물어보세요... [Ctrl + Enter로 바로 실행]"
          rows={4}
          className="min-h-32 resize-y rounded-lg border-border/80 bg-background/80 p-3.5 text-sm leading-relaxed shadow-none placeholder:text-text-secondary focus-visible:border-emerald-500/60 focus-visible:ring-emerald-500/60"
        />

        {routeReason && <p className="text-xs text-text-secondary">라우팅됨: {routeReason}</p>}
        {selectedProviders.length === 0 && (
          <p className="text-xs text-warning">프롬프트를 실행하려면 설정에서 API 키를 하나 이상 등록하고 위 그리드에서 선택하세요.</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-text-secondary">
            선택된 프로바이더:{" "}
            <span className="font-semibold text-foreground">
              {selectedProviders.length > 0 ? selectedProviders.map((p) => PROVIDER_LABELS[p]).join(", ") : "없음"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {imageFiles.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1.5 text-xs text-text-secondary outline-none transition-colors hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg)] hover:text-foreground">
                  <ImageIcon className="size-3.5" /> 이미지 첨부
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {imageFiles.map((file) => (
                    <DropdownMenuItem key={file.id} onClick={() => toggleAttachmentFileId(file.id)} className="gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local file server route, not a static asset */}
                      <img src={fileUrl(file.id)} alt={file.filename} className="size-6 rounded object-cover" />
                      <span className="flex-1 truncate">{file.filename}</span>
                      {attachmentFileIds.includes(file.id) && <span className="text-primary">✓</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button type="button" onClick={handleExecute} disabled={executeDisabled}>
              {judging ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              실행
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
