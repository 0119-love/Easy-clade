"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProviderEmptyStateProps {
  onChooseProviders: () => void;
}

export function ProviderEmptyState({ onChooseProviders }: ProviderEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent/60">
        <Sparkles className="size-5 text-text-secondary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">연결된 AI 프로바이더가 없습니다</h2>
      <p className="max-w-sm text-sm text-text-secondary">첫 번째 프로바이더를 연결하고 대화를 시작해 보세요.</p>
      <Button type="button" onClick={onChooseProviders} className="mt-2">
        프로바이더 선택하기
      </Button>
    </div>
  );
}
