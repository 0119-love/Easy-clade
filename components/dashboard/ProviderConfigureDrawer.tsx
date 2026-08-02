"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ModelPicker } from "@/components/dashboard/ModelPicker";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EffortControl } from "@/components/dashboard/EffortControl";
import { ProviderMark } from "@/components/ui/provider-mark";
import { PROVIDER_LABELS, type ProviderId } from "@/lib/config/types";
import type { ModelInfo } from "@/lib/providers/types";
import { useDashboardStore } from "@/lib/store/dashboardStore";

interface ProviderConfigureDrawerProps {
  provider: ProviderId;
  models: ModelInfo[];
  isLoading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProviderConfigureDrawer({ provider, models, isLoading, open, onOpenChange }: ProviderConfigureDrawerProps) {
  const card = useDashboardStore((s) => s.cards[provider]);
  const maxTokens = useDashboardStore((s) => s.maxTokens);
  const systemPrompt = useDashboardStore((s) => s.systemPrompt);
  const setCardModel = useDashboardStore((s) => s.setCardModel);
  const setCardTemperature = useDashboardStore((s) => s.setCardTemperature);
  const setCardEffort = useDashboardStore((s) => s.setCardEffort);
  const setMaxTokens = useDashboardStore((s) => s.setMaxTokens);
  const setSystemPrompt = useDashboardStore((s) => s.setSystemPrompt);

  const selectedModel = models.find((m) => m.id === card.model);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center gap-2">
            <ProviderMark provider={provider} size="sm" />
            <SheetTitle>{PROVIDER_LABELS[provider]} 설정</SheetTitle>
          </div>
          <SheetDescription>이 프로바이더에서 사용할 모델과 응답 방식을 조정하세요.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="text-xs text-text-secondary">모델</Label>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <ModelPicker models={models} value={card.model} onChange={(modelId) => setCardModel(provider, modelId)} />
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`max-tokens-${provider}`} className="text-xs text-text-secondary">
                최대 토큰
              </Label>
              <Input
                id={`max-tokens-${provider}`}
                type="number"
                min={256}
                max={128_000}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value) || 4096)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-text-secondary">컨텍스트 윈도우</Label>
              <div className="flex h-8 items-center rounded-lg border border-input px-2.5 font-mono text-sm text-foreground">
                {selectedModel ? selectedModel.contextWindow.toLocaleString() : "--"}
              </div>
            </div>
          </div>
          <p className="-mt-4 text-[11px] text-text-secondary">
            최대 토큰은 모든 프로바이더에 공통 적용됩니다. 컨텍스트 윈도우는 선택한 모델의 고정값입니다.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor={`system-prompt-${provider}`} className="text-xs text-text-secondary">
              시스템 프롬프트 <span className="text-text-secondary/70">(공통)</span>
            </Label>
            <Textarea
              id={`system-prompt-${provider}`}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="당신은 유용한 어시스턴트입니다..."
              className="min-h-24 resize-none"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
