"use client";

import { Play, Square } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ProviderMark } from "@/components/ui/provider-mark";
import { EffortControl } from "@/components/dashboard/EffortControl";
import { cn } from "@/lib/utils";
import { PROVIDER_LABELS, type ProviderId, type ProviderKeyStatus } from "@/lib/config/types";
import type { ModelInfo } from "@/lib/providers/types";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { runProvider, stopProvider } from "@/lib/streamClient";
import { CARD_STATUS_LABELS, formatRelativeTimeKo } from "@/lib/i18n/labels";

interface ModelCardProps {
  provider: ProviderId;
  models: ModelInfo[];
  keyStatus: ProviderKeyStatus | undefined;
  isLoading?: boolean;
}

function Stat({
  label,
  value,
  format,
}: {
  label: string;
  value: number | null;
  format: (v: number) => string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-text-secondary">{label}</span>
      <span className="font-mono text-[13px] text-foreground">
        {value === null ? "--" : <AnimatedNumber value={value} format={format} />}
      </span>
    </div>
  );
}

export function ModelCard({ provider, models, keyStatus, isLoading }: ModelCardProps) {
  const card = useDashboardStore((s) => s.cards[provider]);
  const userPrompt = useDashboardStore((s) => s.userPrompt);
  const systemPrompt = useDashboardStore((s) => s.systemPrompt);
  const maxTokens = useDashboardStore((s) => s.maxTokens);
  const setCardModel = useDashboardStore((s) => s.setCardModel);
  const setCardTemperature = useDashboardStore((s) => s.setCardTemperature);
  const setCardEffort = useDashboardStore((s) => s.setCardEffort);
  const currentProjectId = useDashboardStore((s) => s.currentProjectId);
  const attachmentFileIds = useDashboardStore((s) => s.attachmentFileIds);

  const configured = keyStatus?.configured ?? false;
  const isRunning = card.status === "running";
  const runDisabled = !configured || (!isRunning && !userPrompt.trim());

  function handleRun() {
    if (!userPrompt.trim() || !configured || isRunning) return;
    void runProvider({
      provider,
      model: card.model,
      systemPrompt: systemPrompt || undefined,
      userPrompt,
      temperature: card.temperature,
      maxTokens,
      effort: card.effort,
      runGroupId: crypto.randomUUID(),
      projectId: currentProjectId,
      attachmentFileIds,
    });
  }

  const statusDotClass = !configured
    ? "bg-muted-foreground"
    : keyStatus?.lastCallStatus === "error"
      ? "bg-danger"
      : "bg-success";

  const statusTooltip = !configured
    ? "API 키가 등록되지 않았습니다."
    : keyStatus?.lastCallStatus === "error"
      ? (keyStatus?.lastCallError ?? "마지막 호출이 실패했습니다.")
      : `마지막 성공: ${formatRelativeTimeKo(keyStatus?.lastSuccessfulCallAt)}`;

  const runDisabledReason = !configured
    ? "설정에서 API 키를 먼저 등록하세요."
    : !userPrompt.trim()
      ? "프롬프트를 먼저 입력하세요."
      : null;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2.5">
        <ProviderMark provider={provider} size="sm" />
        <span className="text-[15px] font-semibold text-foreground">{PROVIDER_LABELS[provider]}</span>
        <Tooltip>
          <TooltipTrigger render={<span className={cn("size-1.5 rounded-full", statusDotClass)} />} />
          <TooltipContent>{statusTooltip}</TooltipContent>
        </Tooltip>
      </div>

      {isLoading ? (
        <Skeleton className="h-5 w-32" />
      ) : (
        <Select value={card.model} onValueChange={(value) => value && setCardModel(provider, value as string)}>
          <SelectTrigger variant="ghost" className="h-auto w-fit">
            <SelectValue>{(value: string) => models.find((m) => m.id === value)?.label ?? value}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex items-center gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-8 w-14" />
          </>
        ) : (
          <>
            <Stat
              label="지연시간"
              value={card.metrics?.latencyMs ?? null}
              format={(v) => `${Math.round(v).toLocaleString()}ms`}
            />
            <Stat label="비용" value={card.metrics?.costUsd ?? null} format={(v) => `$${v.toFixed(4)}`} />
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>온도</span>
          <span className="font-mono">{card.temperature.toFixed(1)}</span>
        </div>
        <Slider
          value={[card.temperature]}
          onValueChange={(value) => setCardTemperature(provider, Array.isArray(value) ? value[0] : value)}
          min={0}
          max={2}
          step={0.1}
        />
      </div>

      <EffortControl value={card.effort} onChange={(effort) => setCardEffort(provider, effort)} />

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant={isRunning ? "destructive" : "outline"}
              disabled={runDisabled}
              onClick={isRunning ? () => stopProvider(provider) : handleRun}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Square className="size-3.5" /> 중지
                </>
              ) : (
                <>
                  <Play className="size-3.5" /> 실행
                </>
              )}
            </Button>
          }
        />
        {runDisabledReason && <TooltipContent>{runDisabledReason}</TooltipContent>}
      </Tooltip>

      <Accordion>
        <AccordionItem value="advanced" className="border-none">
          <AccordionTrigger className="py-1 text-xs text-text-secondary hover:no-underline">
            고급 설정
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">입력 토큰</span>
                <span className="font-mono text-foreground">
                  {card.metrics ? <AnimatedNumber value={card.metrics.inputTokens} /> : "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">출력 토큰</span>
                <span className="font-mono text-foreground">
                  {card.metrics ? <AnimatedNumber value={card.metrics.outputTokens} /> : "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">상태</span>
                <span className="font-mono text-foreground">{CARD_STATUS_LABELS[card.status]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">마지막 호출</span>
                <span className="font-mono text-foreground">
                  {configured ? formatRelativeTimeKo(keyStatus?.lastSuccessfulCallAt) : "키 없음"}
                </span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
