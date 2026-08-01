"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Gavel, LogOut, Play, Plus, Search, Zap } from "lucide-react";
import { cn, emailInitials } from "@/lib/utils";
import { PROVIDER_IDS, PROVIDER_LABELS } from "@/lib/config/types";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { useSystemStatus } from "@/lib/hooks/useSystemStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { ThemeToggleButton } from "@/components/layout/ThemeToggleButton";

// Same routes/icons as Sidebar.tsx/CommandPalette.tsx's entries for these
// destinations, so they wear the same icon everywhere.
const QUICK_CREATE_ITEMS = [
  { href: "/app/run", label: "새 실행", icon: Play },
  { href: "/committee", label: "새 Committee", icon: Gavel },
  { href: "/automations", label: "새 자동화", icon: Zap },
] as const;

// Six controls: Search, Quick Create, Workspace, Connection Status, Theme
// Toggle, Profile. Still no notifications bell, no plan badge -- there's no
// real notification system behind one, and this app has no subscription tiers.
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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" size="sm" variant="secondary">
                <Plus className="size-3.5" /> 빠른 생성
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {QUICK_CREATE_ITEMS.map((item) => (
              <DropdownMenuItem key={item.href} onClick={() => router.push(item.href)}>
                <item.icon className="size-4" /> {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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

        <ThemeToggleButton />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button type="button" className="outline-none">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  {emailInitials(userEmail)}
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
