"use client";

import Link from "next/link";
import {
  Users,
  Zap,
  Brain,
  GitBranch,
  CheckSquare,
  FolderGit2,
  Activity,
  Layers,
  ArrowRight,
  Plus,
  Play,
} from "lucide-react";
import type { BrainRegionStatus } from "@/lib/brain/queries";
import { cn } from "@/lib/utils";

interface HubCardMeta {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  icon: React.ElementType;
  href: string;
  actionText: string;
  actionHref: string;
  accentColor: string;
}

const SUBSYSTEM_METAS: HubCardMeta[] = [
  {
    id: "committee",
    name: "AI Committee",
    nameKo: "AI 집행 위원회",
    description: "다중 LLM(Claude, Gemini, GPT) 협동 심의 및 비교 검토",
    icon: Users,
    href: "/committee",
    actionText: "새 위원회 실행",
    actionHref: "/committee",
    accentColor: "from-purple-500/20 to-purple-900/10 border-purple-500/30 text-purple-400",
  },
  {
    id: "automations",
    name: "Automations",
    nameKo: "자동화 스케줄러",
    description: "주기적 AI 백그라운드 태스크 및 트리거 실행기",
    icon: Zap,
    href: "/automations",
    actionText: "새 자동화 등록",
    actionHref: "/automations",
    accentColor: "from-amber-500/20 to-amber-900/10 border-amber-500/30 text-amber-400",
  },
  {
    id: "memory",
    name: "Memory",
    nameKo: "AI 지속성 메모리",
    description: "컨텍스트 지식 저장소 및 핀 고정 프롬프트 뱅크",
    icon: Brain,
    href: "/memory",
    actionText: "지식/메모리 추가",
    actionHref: "/memory",
    accentColor: "from-emerald-500/20 to-emerald-900/10 border-emerald-500/30 text-emerald-400",
  },
  {
    id: "workflows",
    name: "Workflows",
    nameKo: "파이프라인 워크플로우",
    description: "다단계 AI 에이전트 연쇄 워크플로우 정의",
    icon: GitBranch,
    href: "/workflows",
    actionText: "워크플로우 생성",
    actionHref: "/workflows",
    accentColor: "from-pink-500/20 to-pink-900/10 border-pink-500/30 text-pink-400",
  },
  {
    id: "tasks",
    name: "Tasks",
    nameKo: "태스크 관리",
    description: "AI 가 할당받은 실행 목표 및 처리 현황",
    icon: CheckSquare,
    href: "/tasks",
    actionText: "태스크 추가",
    actionHref: "/tasks",
    accentColor: "from-cyan-500/20 to-cyan-900/10 border-cyan-500/30 text-cyan-400",
  },
  {
    id: "projects",
    name: "Projects",
    nameKo: "프로젝트 지휘소",
    description: "코드베이스 및 워크스페이스별 AI 컨텍스트",
    icon: FolderGit2,
    href: "/projects",
    actionText: "프로젝트 등록",
    actionHref: "/projects",
    accentColor: "from-blue-500/20 to-blue-900/10 border-blue-500/30 text-blue-400",
  },
  {
    id: "runs",
    name: "Runs Log",
    nameKo: "실행 & 토큰 모니터",
    description: "모든 AI 요청의 실시간 지연 시간 및 토큰 비용 타임라인",
    icon: Activity,
    href: "/activity",
    actionText: "로그 상세보기",
    actionHref: "/activity",
    accentColor: "from-rose-500/20 to-rose-900/10 border-rose-500/30 text-rose-400",
  },
  {
    id: "integrations",
    name: "Integrations",
    nameKo: "외부 도구 연동",
    description: "GitHub, Vercel, Slack 등 사외 서비스 허브",
    icon: Layers,
    href: "/integrations",
    actionText: "연동 관리",
    actionHref: "/integrations",
    accentColor: "from-teal-500/20 to-teal-900/10 border-teal-500/30 text-teal-400",
  },
];

export function BrainSubsystemsHub({ regions }: { regions: BrainRegionStatus[] | undefined }) {
  const regionMap = new Map((regions ?? []).map((r) => [r.id, r]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {SUBSYSTEM_METAS.map((sub) => {
        const raw = regionMap.get(sub.id as any);
        const Icon = sub.icon;
        const isRunning = raw?.status === "running";
        const isError = raw?.status === "error";

        return (
          <div
            key={sub.id}
            className={cn(
              "group relative flex flex-col justify-between rounded-xl border bg-gradient-to-b p-4 transition-all duration-200 hover:scale-[1.01] hover:shadow-xl",
              sub.accentColor
            )}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-black/40 border border-white/10 backdrop-blur-sm">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground leading-tight">{sub.nameKo}</h4>
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider">{sub.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-full bg-black/40 border border-white/10 px-2 py-0.5 text-[10px] font-medium">
                  <span
                    className={cn(
                      "size-1.5 rounded-full animate-pulse",
                      isError ? "bg-red-400" : isRunning ? "bg-emerald-400" : "bg-zinc-500"
                    )}
                  />
                  <span className="text-zinc-300">
                    {isError ? "오류" : isRunning ? "작동중" : "대기"}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-xs text-text-secondary leading-relaxed min-h-[36px]">
                {sub.description}
              </p>

              {/* Dynamic metrics strip */}
              <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-2.5">
                {raw?.metrics?.map((m) => (
                  <div key={m.label} className="flex items-center gap-1 text-[11px]">
                    <span className="text-text-secondary">{m.label}:</span>
                    <span className="font-semibold text-foreground">{m.value}</span>
                  </div>
                )) ?? (
                  <div className="text-[11px] text-text-secondary">상태 불러오는 중...</div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
              <Link
                href={sub.href}
                className="inline-flex items-center gap-1 text-xs text-text-secondary transition-colors hover:text-foreground"
              >
                상세 보기
                <ArrowRight className="size-3" />
              </Link>

              <Link
                href={sub.actionHref}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/10 border border-white/10 px-2.5 py-1 text-xs font-semibold text-foreground transition-all hover:bg-white/20 active:scale-95"
              >
                {sub.id === "committee" || sub.id === "automations" ? (
                  <Play className="size-3" />
                ) : (
                  <Plus className="size-3" />
                )}
                {sub.actionText}
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
