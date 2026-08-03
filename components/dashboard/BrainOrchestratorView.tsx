"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Zap,
  Crown,
  Brain,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  TrendingDown,
  Clock,
  Coins,
  Copy,
  Check,
  Cpu,
  Layers,
  ArrowRight,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ProviderMark } from "@/components/ui/provider-mark";
import { BrainHistorySidebar } from "@/components/dashboard/BrainHistorySidebar";
import { PROVIDER_LABELS, type ProviderId } from "@/lib/config/types";
import type { BrainHistoryEntry } from "@/lib/brain/client";

type ModeType = "cost_saver" | "best_quality" | "auto";

interface Candidate {
  provider: ProviderId;
  model: string;
  providerLabel: string;
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
}

interface OrchestrationResult {
  mode: ModeType;
  finalResponse: string;
  candidates: Candidate[];
  metrics: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
    savedCostUsd: number;
    savedPercentage: number;
    executionTimeMs: number;
    primaryProvider: string;
  };
}

const ALL_PROVIDERS: Array<{ id: ProviderId; name: string; modelName: string }> = [
  { id: "openai", name: "ChatGPT", modelName: "GPT-4o / GPT-4o-mini" },
  { id: "anthropic", name: "Claude", modelName: "Claude 3.5 Sonnet / Haiku" },
  { id: "google", name: "Google Gemini", modelName: "Gemini 2.5 Pro / Flash" },
  { id: "xai", name: "xAI (Grok)", modelName: "Grok 2" },
  { id: "perplexity", name: "Perplexity", modelName: "Sonar Pro" },
  { id: "deepseek", name: "DeepSeek", modelName: "DeepSeek V3 / R1" },
];

const SAMPLE_PROMPTS = [
  { label: "⚡ 요약 & 핵심 추출", text: "다음 문장의 핵심 내용을 3가지 항목으로 간결하게 요약해 줘." },
  { label: "💡 코드 최적화", text: "이 코드의 실행 속도와 메모리 사용량을 최적화하고 리팩토링해 줘." },
  { label: "👑 다중 AI 아키텍처 비교", text: "Next.js 16과 React 19 기반의 확장 가능한 웹 애플리케이션 구조를 비교 분석해 줘." },
];

export function BrainOrchestratorView() {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<ModeType>("auto");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrchestrationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("final");
  const [historySelectedId, setHistorySelectedId] = useState<number | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Selected providers state
  const [selectedProviders, setSelectedProviders] = useState<ProviderId[]>([]);

  // Fetch API keys configuration status
  const { data: keysData, isLoading: keysLoading } = useQuery({
    queryKey: ["settings", "keys"],
    queryFn: async () => {
      const res = await fetch("/api/settings/keys");
      if (!res.ok) throw new Error("API 키 상태 조회 실패");
      return res.json() as Promise<{
        providers: Record<ProviderId, { configured: boolean; maskedKey: string | null }>;
      }>;
    },
  });

  // Initialize selected providers to configured ones -- once, the first time
  // the key status loads. Without the guard, any background refetch of
  // keysData (e.g. react-query's refetch-on-window-focus) would re-run this
  // and silently wipe out a provider the user had manually unchecked.
  const didInitProviders = useRef(false);
  useEffect(() => {
    if (keysData?.providers && !didInitProviders.current) {
      didInitProviders.current = true;
      const configuredIds = ALL_PROVIDERS.map((p) => p.id).filter((id) => keysData.providers[id]?.configured);
      setSelectedProviders(configuredIds.length > 0 ? configuredIds : ["google", "openai"]);
    }
  }, [keysData]);

  const toggleProvider = (id: ProviderId) => {
    const isConfigured = keysData?.providers?.[id]?.configured;
    if (!isConfigured) {
      toast.error(`${PROVIDER_LABELS[id]}의 API 키가 등록되지 않았습니다. [설정] 메뉴에서 키를 입력해 주세요.`);
      return;
    }

    setSelectedProviders((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) {
          toast.warning("최소 1개 이상의 AI 프로바이더를 선택해야 합니다.");
          return prev;
        }
        return prev.filter((p) => p !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleRun = async () => {
    if (!prompt.trim() || loading) return;
    if (selectedProviders.length === 0) {
      toast.error("조합할 AI 모델을 최소 1개 이상 선택해 주세요.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/brain/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          mode,
          selectedProviders,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "오케스트레이션 실행 실패");
      }

      const data: OrchestrationResult = await res.json();
      setResult(data);
      setActiveTab("final");
      setHistorySelectedId(null);
      // The route just persisted this run (see app/api/brain/orchestrate/route.ts) --
      // bumping the query key re-fetches the sidebar so the new entry shows up now, not
      // after a manual reload.
      setHistoryRefreshKey((k) => k + 1);
      toast.success(`${selectedProviders.length}개 AI 조합 오케스트레이션 완료!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "실행 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  function handleSelectHistory(entry: BrainHistoryEntry) {
    const candidates: Candidate[] = entry.candidatesJson
      ? (JSON.parse(entry.candidatesJson) as Candidate[])
      : [
          {
            provider: entry.provider,
            model: entry.model,
            providerLabel: PROVIDER_LABELS[entry.provider],
            text: entry.responseText ?? "",
            inputTokens: entry.inputTokens,
            outputTokens: entry.outputTokens,
            costUsd: entry.costUsd,
            latencyMs: entry.durationMs ?? 0,
          },
        ];

    setPrompt(entry.userPrompt);
    setMode(entry.mode);
    setResult({
      mode: entry.mode,
      finalResponse: entry.responseText ?? "",
      candidates,
      metrics: {
        totalInputTokens: entry.inputTokens,
        totalOutputTokens: entry.outputTokens,
        totalCostUsd: entry.costUsd,
        savedCostUsd: 0,
        savedPercentage: 0,
        executionTimeMs: entry.durationMs ?? 0,
        primaryProvider: candidates.map((c) => c.providerLabel).join(" + "),
      },
    });
    setActiveTab("final");
    setHistorySelectedId(entry.id);
  }

  function handleNewPrompt() {
    setPrompt("");
    setResult(null);
    setHistorySelectedId(null);
    setActiveTab("final");
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("클립보드에 복사되었습니다.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-6">
      <BrainHistorySidebar
        selectedId={historySelectedId}
        onSelect={handleSelectHistory}
        onNew={handleNewPrompt}
        refreshKey={historyRefreshKey}
      />

      <div className="min-w-0 flex-1 space-y-6">
      {/* 6 AI Provider Selector Grid (Key Configured Check) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-foreground flex items-center gap-2">
            <Layers className="size-4 text-emerald-400" />
            조합할 AI 모델 선택 (API 키 저장된 AI만 클릭 가능)
          </label>
          <span className="text-[11px] text-text-secondary">
            선택됨: <span className="font-bold text-emerald-400">{selectedProviders.length}개 AI</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {ALL_PROVIDERS.map((prov) => {
            const isConfigured = keysData?.providers?.[prov.id]?.configured ?? false;
            const isSelected = selectedProviders.includes(prov.id);

            return (
              <button
                key={prov.id}
                type="button"
                onClick={() => toggleProvider(prov.id)}
                disabled={keysLoading}
                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 ${
                  isConfigured
                    ? isSelected
                      ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500 shadow-md text-foreground cursor-pointer"
                      : "border-border/80 bg-card/60 hover:border-emerald-500/50 hover:bg-card text-text-secondary cursor-pointer"
                    : "border-border/40 bg-secondary/20 text-zinc-500 cursor-not-allowed opacity-60"
                }`}
              >
                {/* Active Checkmark or Lock Icon */}
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

                <ProviderMark provider={prov.id} size="default" className="mb-2" />
                <span className="text-xs font-bold leading-tight">{prov.name}</span>
                <span className="mt-0.5 text-[9.5px] text-text-secondary truncate max-w-full">
                  {prov.modelName}
                </span>

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

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Cost Saver Mode */}
        <button
          type="button"
          onClick={() => setMode("cost_saver")}
          className={`flex flex-col justify-between p-4 rounded-xl border text-left transition-all duration-200 ${
            mode === "cost_saver"
              ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500"
              : "border-border/60 bg-card/60 hover:bg-card hover:border-border"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Zap className="size-4" />
                </div>
                <span className="text-sm font-bold text-foreground">최저 토큰 & 비용 절감</span>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                Max Savings
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              선택한 AI 중 가장 토큰 소비가 적고 빠른 모델을 자동 선정하여 최소 비용으로 대답합니다.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-emerald-500/10 flex items-center justify-between text-[11px] text-emerald-400 font-medium">
            <span>비용 절감율 ~90%</span>
            <ArrowRight className="size-3" />
          </div>
        </button>

        {/* Smart Auto Mode */}
        <button
          type="button"
          onClick={() => setMode("auto")}
          className={`flex flex-col justify-between p-4 rounded-xl border text-left transition-all duration-200 ${
            mode === "auto"
              ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500"
              : "border-border/60 bg-card/60 hover:bg-card hover:border-border"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Brain className="size-4" />
                </div>
                <span className="text-sm font-bold text-foreground">스마트 자동 라우팅</span>
              </div>
              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                Recommended
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              프롬프트 난이도를 자동 분석하여 토큰 절약 또는 선택 AI 간의 교차 검증을 자동 결정합니다.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-indigo-500/10 flex items-center justify-between text-[11px] text-indigo-400 font-medium">
            <span>지능형 판단 라우터</span>
            <ArrowRight className="size-3" />
          </div>
        </button>

        {/* Best Quality Mode */}
        <button
          type="button"
          onClick={() => setMode("best_quality")}
          className={`flex flex-col justify-between p-4 rounded-xl border text-left transition-all duration-200 ${
            mode === "best_quality"
              ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500"
              : "border-border/60 bg-card/60 hover:bg-card hover:border-border"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <Crown className="size-4" />
                </div>
                <span className="text-sm font-bold text-foreground">최고 품질 & 완벽 대답</span>
              </div>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                Selected AI Synthesis
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              선택된 {selectedProviders.length}개 AI 모델들을 동시 실행하고 답변을 비교 및 교차 합성합니다.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-amber-500/10 flex items-center justify-between text-[11px] text-amber-400 font-medium">
            <span>선택 AI 다중 합성</span>
            <ArrowRight className="size-3" />
          </div>
        </button>
      </div>

      {/* Main Prompt Composer Area */}
      <div className="rounded-xl border border-border/80 bg-card/80 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-400" />
            AI 프롬프트 작성
          </label>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] text-text-secondary shrink-0">샘플 질문:</span>
            {SAMPLE_PROMPTS.map((sample, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPrompt(sample.text)}
                className="shrink-0 rounded-full border border-border/60 bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:text-foreground hover:bg-secondary transition-colors"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                handleRun();
              }
            }}
            placeholder="실행할 프롬프트를 자유롭게 입력해 주세요... [Ctrl + Enter로 바로 실행]"
            rows={4}
            className="w-full rounded-lg border border-border/80 bg-background/80 p-3.5 text-xs sm:text-sm text-foreground placeholder:text-text-secondary focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 transition-all resize-y"
          />

          <div className="flex items-center justify-between mt-3">
            <div className="text-[11px] text-text-secondary">
              선택된 프로바이더:{" "}
              <span className="font-semibold text-foreground">
                {selectedProviders.map((p) => PROVIDER_LABELS[p]).join(", ")}
              </span>
            </div>

            <button
              type="button"
              onClick={handleRun}
              disabled={loading || !prompt.trim() || selectedProviders.length === 0}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {loading ? "AI 오케스트레이션 실행 중..." : "AI 오케스트레이션 실행"}
            </button>
          </div>
        </div>
      </div>

      {/* Loading Animation State */}
      {loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card/40 py-12 px-4 space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="size-14 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <Brain className="absolute size-6 text-emerald-400 animate-pulse" />
          </div>
          <div className="text-center">
            <h4 className="text-sm font-bold text-foreground">AI 모델 라우팅 & 패킷 조합 중...</h4>
            <p className="mt-1 text-xs text-text-secondary">
              선택하신 <span className="font-semibold text-emerald-400">{selectedProviders.map((p) => PROVIDER_LABELS[p]).join(", ")}</span> 모델로 조합 질의 및 패킷 분사 진행 중입니다.
            </p>
          </div>
        </div>
      )}

      {/* Results View */}
      {result && !loading && (
        <div className="rounded-xl border border-border/80 bg-card/80 p-5 shadow-sm space-y-5">
          {/* Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg border border-border/40 bg-secondary/30 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
                <Coins className="size-4" />
              </div>
              <div>
                <div className="text-[10px] text-text-secondary uppercase font-semibold">총 토큰 소모</div>
                <div className="font-bold text-foreground tabular-nums">
                  {(result.metrics.totalInputTokens + result.metrics.totalOutputTokens).toLocaleString()} tokens
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400">
                <Clock className="size-4" />
              </div>
              <div>
                <div className="text-[10px] text-text-secondary uppercase font-semibold">응답 지연 속도</div>
                <div className="font-bold text-foreground tabular-nums">{result.metrics.executionTimeMs} ms</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-400">
                <Cpu className="size-4" />
              </div>
              <div>
                <div className="text-[10px] text-text-secondary uppercase font-semibold">조합된 AI 모델</div>
                <div className="font-bold text-foreground truncate max-w-[140px]">
                  {result.metrics.primaryProvider}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
                <TrendingDown className="size-4" />
              </div>
              <div>
                <div className="text-[10px] text-text-secondary uppercase font-semibold">비용 절감 효과</div>
                <div className="font-bold text-emerald-400 tabular-nums">
                  {result.mode === "cost_saver" ? `~${result.metrics.savedPercentage}% 절약 ($${result.metrics.totalCostUsd.toFixed(5)})` : `$${result.metrics.totalCostUsd.toFixed(4)}`}
                </div>
              </div>
            </div>
          </div>

          {/* Candidate / Final Tabs */}
          <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("final")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                activeTab === "final" ? "bg-emerald-600 text-white" : "text-text-secondary hover:text-foreground"
              }`}
            >
              <Crown className="size-3.5" />
              합성된 최적 답변
            </button>

            {result.candidates.map((cand, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTab(`cand-${idx}`)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                  activeTab === `cand-${idx}` ? "bg-emerald-600 text-white" : "text-text-secondary hover:text-foreground"
                }`}
              >
                <ProviderMark provider={cand.provider} size="sm" />
                {cand.providerLabel} ({cand.model})
              </button>
            ))}
          </div>

          {/* Answer Display Card */}
          <div className="relative rounded-lg border border-border/60 bg-background/60 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400" />
                <span className="text-xs font-bold text-foreground">
                  {activeTab === "final" ? "AI 오케스트레이션 결과" : "개별 선택 모델 응답"}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    activeTab === "final"
                      ? result.finalResponse
                      : result.candidates[parseInt(activeTab.split("-")[1])]?.text || ""
                  )
                }
                className="flex items-center gap-1 rounded-md border border-border/60 bg-secondary/50 px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:text-foreground hover:bg-secondary"
              >
                {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                {copied ? "복사됨" : "답변 복사"}
              </button>
            </div>

            <div className="prose prose-invert prose-sm max-w-none text-xs sm:text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {activeTab === "final"
                  ? result.finalResponse
                  : result.candidates[parseInt(activeTab.split("-")[1])]?.text || ""}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Footnote Explanation Section (Apple-style footer documentation) */}
      <footer className="mt-16 border-t border-border/40 pt-6 pb-8 space-y-2 text-[11px] text-text-secondary/70 leading-relaxed font-sans">
        <p>
          1. <strong>1단계 - 프롬프트 정밀 분석 (Prompt Analysis):</strong> 입력받은 질문의 토큰 크기, 난이도, 특정 목적(코드 최적화, 수학, 일반 문서, 요약 등)을 실시간으로 분석합니다.
        </p>
        <p>
          2. <strong>2단계 - 선택된 AI 필터링 (Provider Filtering):</strong> 사용자가 직접 클릭하여 활성화한 AI 모델들(API 키가 저장된 모델)만을 라우팅 후보군으로 필터링합니다.
        </p>
        <p>
          3. <strong>3단계 - 멀티 스레드 병렬 질의 (Multi-thread Query):</strong> 선택된 AI 모델들에 비동기 병렬(Parallel Stream) 방식으로 동시에 질문 패킷을 전송합니다.
        </p>
        <p>
          4. <strong>4단계 - 결과 교차 검증 & 합성 (Consensus & Synthesis):</strong> 돌아온 각 AI의 답변을 교차 비교하여 중복을 제거하고, 오류 없는 최선의 합성 답변 및 토큰/비용 절감 리포트를 완성합니다.
        </p>
      </footer>
      </div>
    </div>
  );
}
