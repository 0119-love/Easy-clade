"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROVIDER_IDS, PROVIDER_LABELS, type KeysStatusResponse } from "@/lib/config/types";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchProjects } from "@/lib/projects/client";

async function fetchKeysStatus(): Promise<KeysStatusResponse> {
  const res = await fetch("/api/settings/keys");
  if (!res.ok) throw new Error("키 상태를 불러오지 못했습니다.");
  return res.json();
}

function useSystemStatus() {
  const { data, isPending } = useQuery({ queryKey: ["settings", "keys"], queryFn: fetchKeysStatus });
  const providers = data ? Object.values(data.providers) : [];
  const configuredCount = providers.filter((p) => p.configured).length;
  const anyRecentFailure = providers.some((p) => p.configured && p.lastCallStatus === "error");

  if (configuredCount === 0) {
    return { label: "등록된 프로바이더 없음", dotClass: "bg-muted-foreground", data, isPending };
  }
  if (anyRecentFailure) {
    return { label: "일부 오류", dotClass: "bg-warning", data, isPending };
  }
  return { label: "정상 작동 중", dotClass: "bg-success", data, isPending };
}

// Trimmed to exactly four controls per the design brief: Search, Workspace,
// Connection Status, Profile. No notifications bell, no plan badge.
export function TopBar({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const status = useSystemStatus();
  const setCommandPaletteOpen = useDashboardStore((s) => s.setCommandPaletteOpen);
  const currentProjectId = useDashboardStore((s) => s.currentProjectId);
  const setCurrentProjectId = useDashboardStore((s) => s.setCurrentProjectId);
  // Global, not just the dashboard page's own copy of this control -- the
  // active project should follow you into Automations, Analytics, etc. too.
  const { data: projectsData } = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between px-8">
      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        className="flex w-72 items-center gap-2 rounded-full px-3 py-1.5 text-sm text-text-secondary transition-colors duration-150 hover:bg-[var(--glass-bg)] hover:text-foreground hover:backdrop-blur-sm"
      >
        <Search className="size-4" strokeWidth={1.75} />
        <span className="flex-1 text-left">검색...</span>
        <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-text-secondary">⌘K</kbd>
      </button>

      <div className="flex items-center gap-6">
        <Select
          value={currentProjectId ? String(currentProjectId) : "none"}
          onValueChange={(v) => setCurrentProjectId(v === "none" ? null : Number(v))}
        >
          <SelectTrigger
            variant="ghost"
            className="rounded-full px-2.5 py-1 text-sm text-text-secondary hover:bg-[var(--glass-bg)] hover:text-foreground hover:backdrop-blur-sm"
          >
            <SelectValue>
              {(v: string) => (v === "none" ? "기본" : (projectsData?.projects.find((p) => String(p.id) === v)?.name ?? "기본"))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="none">기본</SelectItem>
            {projectsData?.projects.map((project) => (
              <SelectItem key={project.id} value={String(project.id)}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {status.isPending ? (
          <Skeleton className="h-3 w-24" />
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className={cn("size-1.5 rounded-full", status.dotClass)} />
                  {status.label}
                </div>
              }
            />
            <TooltipContent>
              <div className="space-y-1">
                {PROVIDER_IDS.map((id) => {
                  const p = status.data?.providers[id];
                  return (
                    <div key={id}>
                      {PROVIDER_LABELS[id]}: {!p?.configured ? "미등록" : p.lastCallStatus === "error" ? "오류" : "정상"}
                    </div>
                  );
                })}
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button type="button" className="outline-none">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  {userEmail.slice(0, 1).toUpperCase()}
                </span>
              </button>
            }
          />
          <DropdownMenuContent align="end">
            <div className="truncate px-1.5 py-1 text-xs text-text-secondary">{userEmail}</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void handleLogout()}>
              <LogOut className="size-4" /> 로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
