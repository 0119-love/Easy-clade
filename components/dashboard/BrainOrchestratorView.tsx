"use client";

import { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ModeType = "cost_saver" | "best_quality" | "auto";

interface Candidate {
  provider: string;
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

  const handleRun = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/brain/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), mode }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "오케스트레이션 실행 실패");
      }

      const data: OrchestrationResult = await res.json();
      setResult(data);
      setActiveTab("final");
      toast.success("AI 프롬프트 라우팅 & 생성이 완료되었습니다!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "실행 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("클립보드에 복사되었습니다.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Mode Selection Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Cost Saver Mode Card */}
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
              가장 토큰 소비가 적고 빠른 모델을 자동 선정하여 최소 비용으로 대답을 도출합니다.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-emerald-500/10 flex items-center justify-between text-[11px] text-emerald-400 font-medium">
            <span>평균 비용 -90% 절감</span>
            <ArrowRight className="size-3" />
          </div>
        </button>

        {/* Smart Auto Mode Card */}
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
              프롬프트 복잡도와 의도를 자동 분석하여 토큰 절약 또는 멀티 AI 교차 검증을 자동 결정합니다.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-indigo-500/10 flex items-center justify-between text-[11px] text-indigo-400 font-medium">
            <span>지능형 무결성 분석</span>
            <ArrowRight className="size-3" />
          </div>
        </button>

        {/* Best Quality Mode Card */}
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
                Multi-AI Consensus
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              최고 성능 AI(Claude, Gemini Pro, GPT-4o)들을 동시 실행하여 교차 검증된 최고의 답변을 합성합니다.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-amber-500/10 flex items-center justify-between text-[11px] text-amber-400 font-medium">
            <span>완벽 무오류 멀티 검증</span>
            <ArrowRight className="size-3" />
          </div>
        </button>
      </div>

      {/* 2. Main Prompt Composer Area */}
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
            placeholder="실행할 프롬프트를 자유롭게 입력해 주세요 (예: 복잡한 코드 리뷰, 요약, 문서 작성, 아이디어 구상 등)... [Ctrl + Enter로 바로 실행]"
            rows={4}
            className="w-full rounded-lg border border-border/80 bg-background/80 p-3.5 text-xs sm:text-sm text-foreground placeholder:text-text-secondary focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 transition-all resize-y"
          />

          <div className="flex items-center justify-between mt-3">
            <div className="text-[11px] text-text-secondary">
              {prompt.length}자 입력됨 · <span className="font-mono text-emerald-400">Ctrl + Enter</span> 키로 즉시 발사
            </div>

            <button
              type="button"
              onClick={handleRun}
              disabled={loading || !prompt.trim()}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {loading ? "AI 오케스트레이션 실행 중..." : "AI 오케스트레이션 실행"}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Loading Animation State */}
      {loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card/40 py-12 px-4 space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="size-14 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <Brain className="absolute size-6 text-emerald-400 animate-pulse" />
          </div>
          <div className="text-center">
            <h4 className="text-sm font-bold text-foreground">AI 모델 라우팅 & 패킷 조합 중...</h4>
            <p className="mt-1 text-xs text-text-secondary">
              {mode === "cost_saver"
                ? "최저 토큰 소모 모델을 탐색하여 맥락을 최적화하고 있습니다."
                : mode === "best_quality"
                ? "Claude 3.5 Sonnet, Gemini 2.5 Pro, GPT-4o 모델에 병렬 질의 후 최적 대답을 교차 검증 중입니다."
                : "프롬프트 난이도를 분석하여 최고의 라우팅 경로를 선택 중입니다."}
            </p>
          </div>
        </div>
      )}

      {/* 4. Results View */}
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
                <div className="text-[10px] text-text-secondary uppercase font-semibold">사용된 주요 AI</div>
                <div className="font-bold text-foreground truncate max-w-[120px]">
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
          {result.candidates.length > 1 && (
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab("final")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === `cand-${idx}` ? "bg-emerald-600 text-white" : "text-text-secondary hover:text-foreground"
                  }`}
                >
                  <Layers className="size-3.5" />
                  {cand.providerLabel} ({cand.model})
                </button>
              ))}
            </div>
          )}

          {/* Answer Display Card */}
          <div className="relative rounded-lg border border-border/60 bg-background/60 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400" />
                <span className="text-xs font-bold text-foreground">
                  {activeTab === "final" ? "AI 오케스트레이션 결과" : "개별 후보 모델 응답"}
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
    </div>
  );
}
