"use client";

import { BrainOrchestratorView } from "@/components/dashboard/BrainOrchestratorView";

export default function BrainPage() {
  return (
    <div className="space-y-6 px-6 py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="border-b border-border/40 pb-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">브레인</h1>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
            AI Prompt Orchestrator & Token Saver
          </span>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-text-secondary">
          프롬프트를 입력하면 최저 토큰/비용 절감 모드 또는 다중 AI 교차 검증을 통해 가장 완벽한 대답을 도출하는 스마트 AI 지휘소입니다.
        </p>
      </div>

      {/* Main Orchestrator Interface */}
      <BrainOrchestratorView />
    </div>
  );
}
