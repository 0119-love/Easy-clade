"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { PROVIDER_IDS, PROVIDER_LABELS, type KeysStatusResponse } from "@/lib/config/types";
import type { ModelInfo } from "@/lib/providers/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderMark } from "@/components/ui/provider-mark";

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

export default function ModelsPage() {
  const { data: modelsData, isPending: modelsPending } = useQuery({ queryKey: ["models"], queryFn: fetchModels });
  const { data: keysStatus, isPending: keysPending } = useQuery({
    queryKey: ["settings", "keys"],
    queryFn: fetchKeysStatus,
  });
  const isLoading = modelsPending || keysPending;

  return (
    <div className="space-y-8 px-10 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">AI 모델</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        {PROVIDER_IDS.map((provider) => {
          const configured = keysStatus?.providers[provider]?.configured ?? false;
          return (
            <Card key={provider} className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ProviderMark provider={provider} size="sm" />
                  <h2 className="text-[15px] font-semibold text-foreground">{PROVIDER_LABELS[provider]}</h2>
                </div>
                {isLoading ? (
                  <Skeleton className="h-3 w-10" />
                ) : (
                  <span className={cn("text-[11px]", configured ? "text-success" : "text-text-secondary")}>
                    {configured ? "등록됨" : "키 없음"}
                  </span>
                )}
              </div>
              {isLoading ? (
                <ul className="space-y-3">
                  {Array.from({ length: 3 }, (_, i) => (
                    <li key={i} className="space-y-1.5">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-3">
                  {(modelsData?.models[provider] ?? []).map((m) => (
                    <li key={m.id} className="text-xs">
                      <div className="font-medium text-foreground">{m.label}</div>
                      <div className="mt-0.5 text-text-secondary">
                        컨텍스트 {m.contextWindow.toLocaleString()} · 최대 출력 {m.maxOutputTokens.toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
