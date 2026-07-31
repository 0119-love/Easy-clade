"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Link2Off, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PROVIDER_IDS, type KeysStatusResponse, type ProviderId } from "@/lib/config/types";
import type { ModelInfo } from "@/lib/providers/types";
import { PromptComposer } from "@/components/dashboard/PromptComposer";
import { ModelCard } from "@/components/dashboard/ModelCard";
import { ResponseColumn } from "@/components/dashboard/ResponseColumn";
import { RightIntelligencePanel } from "@/components/dashboard/RightIntelligencePanel";
import { ProviderOnboardingModal } from "@/components/dashboard/ProviderOnboardingModal";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { runProvider, stopProvider } from "@/lib/streamClient";
import { fetchPreferences, savePreferencesRemote } from "@/lib/preferences/client";

// Tailwind needs static class names to see them at build time -- can't
// interpolate `lg:grid-cols-${n}`.
const GRID_COLS_BY_COUNT: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
};

// At 4+ providers, a wrapping grid leaves a lopsided leftover row (4 -> 3+1,
// 5 -> 3+2) that reads as broken rather than intentional. A single
// horizontally-scrolling row of fixed-width cards stays tidy at any count
// instead, at the cost of needing to scroll sideways to see them all.
const SCROLL_ROW_THRESHOLD = 3;

interface ModelsResponse {
  models: Record<string, ModelInfo[]>;
}

async function fetchModels(): Promise<ModelsResponse> {
  const res = await fetch("/api/models");
  if (!res.ok) throw new Error("모델 목록을 불러오지 못했습니다.");
  return res.json();
}

async function fetchKeysStatus(): Promise<KeysStatusResponse> {
  const res = await fetch("/api/settings/keys");
  if (!res.ok) throw new Error("키 상태를 불러오지 못했습니다.");
  return res.json();
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: modelsData, isPending: modelsPending } = useQuery({ queryKey: ["models"], queryFn: fetchModels });
  const { data: keysStatus, isPending: keysPending } = useQuery({
    queryKey: ["settings", "keys"],
    queryFn: fetchKeysStatus,
  });
  const consensus = useDashboardStore((s) => s.consensus);
  const cards = useDashboardStore((s) => s.cards);
  const userPrompt = useDashboardStore((s) => s.userPrompt);
  const systemPrompt = useDashboardStore((s) => s.systemPrompt);
  const maxTokens = useDashboardStore((s) => s.maxTokens);
  const syncScroll = useDashboardStore((s) => s.syncScroll);
  const setSyncScroll = useDashboardStore((s) => s.setSyncScroll);
  const setShowThinking = useDashboardStore((s) => s.setShowThinking);
  const setCardTemperature = useDashboardStore((s) => s.setCardTemperature);
  const setCardEffort = useDashboardStore((s) => s.setCardEffort);
  const currentProjectId = useDashboardStore((s) => s.currentProjectId);
  const attachmentFileIds = useDashboardStore((s) => s.attachmentFileIds);

  const { data: preferences } = useQuery({ queryKey: ["preferences"], queryFn: fetchPreferences });
  const appliedDefaults = useRef(false);

  useEffect(() => {
    if (!preferences || appliedDefaults.current) return;
    appliedDefaults.current = true;
    setSyncScroll(preferences.syncScrollDefault);
    setShowThinking(preferences.showThinkingByDefault);
    for (const provider of PROVIDER_IDS) {
      setCardTemperature(provider, preferences.defaultTemperature);
      setCardEffort(provider, preferences.defaultEffort);
    }
  }, [preferences, setSyncScroll, setShowThinking, setCardTemperature, setCardEffort]);

  const activeProviders = preferences?.activeProviders ?? PROVIDER_IDS;
  const useScrollRow = activeProviders.length > SCROLL_ROW_THRESHOLD;
  const gridColsClass = GRID_COLS_BY_COUNT[activeProviders.length] ?? GRID_COLS_BY_COUNT[SCROLL_ROW_THRESHOLD];
  const configuredProviders = activeProviders.filter((id) => keysStatus?.providers[id]?.configured);
  const anyRunning = PROVIDER_IDS.some((id) => cards[id].status === "running");
  const canRun = userPrompt.trim().length > 0 && configuredProviders.length > 0 && !anyRunning;

  async function handleProviderOnboardingComplete(selected: ProviderId[]) {
    if (!preferences) return;
    await savePreferencesRemote({ ...preferences, activeProviders: selected, providersOnboarded: true });
    void queryClient.invalidateQueries({ queryKey: ["preferences"] });
  }

  function runAll() {
    if (!canRun) return;
    const runGroupId = crypto.randomUUID();
    for (const provider of configuredProviders) {
      void runProvider({
        provider,
        model: cards[provider].model,
        systemPrompt: systemPrompt || undefined,
        userPrompt,
        temperature: cards[provider].temperature,
        maxTokens,
        effort: cards[provider].effort,
        runGroupId,
        projectId: currentProjectId,
        attachmentFileIds,
      });
    }
  }

  function stopAll() {
    for (const provider of PROVIDER_IDS) stopProvider(provider);
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col gap-10 overflow-y-auto px-10 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">대시보드</h1>
          <div className="flex items-center gap-2">
            {/* Active project is now chosen globally from the TopBar (visible on every
                page), not duplicated here -- see components/layout/TopBar.tsx. */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setSyncScroll(!syncScroll)}
                    aria-pressed={syncScroll}
                  >
                    {syncScroll ? <Link2 className="size-4" /> : <Link2Off className="size-4" />}
                  </Button>
                }
              />
              <TooltipContent>{syncScroll ? "스크롤 동기화 켜짐" : "스크롤 동기화 꺼짐"}</TooltipContent>
            </Tooltip>
            <Button type="button" size="lg" onClick={anyRunning ? stopAll : runAll} disabled={!anyRunning && !canRun}>
              {anyRunning ? (
                <>
                  <Square className="size-4" /> 전체 중지
                </>
              ) : (
                <>
                  <Play className="size-4" /> 전체 실행
                </>
              )}
            </Button>
          </div>
        </div>

        {useScrollRow ? (
          <div className="scroll-fade-x -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {activeProviders.map((provider) => (
              <div key={provider} className="w-80 shrink-0">
                <ModelCard
                  provider={provider}
                  models={modelsData?.models[provider] ?? []}
                  keyStatus={keysStatus?.providers[provider]}
                  isLoading={modelsPending || keysPending}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid grid-cols-1 gap-4 ${gridColsClass}`}>
            {activeProviders.map((provider) => (
              <ModelCard
                key={provider}
                provider={provider}
                models={modelsData?.models[provider] ?? []}
                keyStatus={keysStatus?.providers[provider]}
                isLoading={modelsPending || keysPending}
              />
            ))}
          </div>
        )}

        <PromptComposer keysStatus={keysStatus} activeProviders={activeProviders} />

        {useScrollRow ? (
          <div className="scroll-fade-x -mx-1 flex gap-6 overflow-x-auto px-1 pb-2">
            {activeProviders.map((provider) => (
              <div key={provider} className="w-96 shrink-0">
                <ResponseColumn provider={provider} />
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid grid-cols-1 gap-6 ${gridColsClass}`}>
            {activeProviders.map((provider) => (
              <ResponseColumn key={provider} provider={provider} />
            ))}
          </div>
        )}

        {consensus.status !== "idle" && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">
              {consensus.mode === "consensus" ? "합의" : "최선의 답변"}
            </h2>
            {consensus.status === "running" && <p className="text-sm text-text-secondary">응답을 채점하는 중...</p>}
            {consensus.status === "error" && <p className="text-sm text-danger">{consensus.error}</p>}
            {consensus.status === "done" && (
              <p className="whitespace-pre-wrap text-[15px] text-foreground">{consensus.resultText}</p>
            )}
          </div>
        )}
      </div>

      <RightIntelligencePanel />

      <ProviderOnboardingModal
        open={!!preferences && !preferences.providersOnboarded}
        onComplete={(selected) => void handleProviderOnboardingComplete(selected)}
      />
    </div>
  );
}
