"use client";

import { Check, ChevronDown, Scale, Shuffle, Trophy, type LucideIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { JudgeMode } from "@/lib/store/dashboardStore";
import { cn } from "@/lib/utils";

interface ModeOption {
  value: JudgeMode;
  icon: LucideIcon;
  title: string;
  description: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    value: "consensus",
    icon: Scale,
    title: "합의 판정",
    description: "실행된 모든 응답을 비교해 공통된 결론과 차이점을 정리합니다.",
  },
  {
    value: "best_answer",
    icon: Trophy,
    title: "최선의 답변",
    description: "여러 모델의 응답 중 가장 우수한 답변 하나를 선정합니다.",
  },
  {
    value: "auto_route",
    icon: Shuffle,
    title: "자동 라우팅",
    description: "프롬프트 내용에 가장 적합한 모델 하나에 자동으로 전달합니다.",
  },
];

interface ModeSelectorProps {
  mode: JudgeMode;
  onModeChange: (mode: JudgeMode) => void;
  disabled?: boolean;
}

export function ModeSelector({ mode, onModeChange, disabled }: ModeSelectorProps) {
  const current = MODE_OPTIONS.find((option) => option.value === mode) ?? MODE_OPTIONS[0];
  const CurrentIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-xs text-text-secondary transition-colors outline-none",
          "hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg)] hover:text-foreground hover:backdrop-blur-sm",
          "data-popup-open:border-[var(--glass-border)] data-popup-open:bg-[var(--glass-bg)] data-popup-open:text-foreground data-popup-open:backdrop-blur-sm",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        <CurrentIcon className="size-3.5" />
        {current.title}
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-1.5">
        {MODE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = option.value === mode;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onModeChange(option.value)}
              className="items-start gap-2.5 rounded-md p-2"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-text-secondary" />
              <div className="flex-1 space-y-0.5">
                <div className="text-[13px] font-medium text-foreground">{option.title}</div>
                <div className="text-[11px] leading-relaxed text-text-secondary">{option.description}</div>
              </div>
              {selected && <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
