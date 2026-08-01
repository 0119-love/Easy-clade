"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  FolderKanban,
  Folder,
  Gavel,
  KeyRound,
  LayoutDashboard,
  ListTodo,
  Play,
  Plug,
  Settings,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useDashboardStore } from "@/lib/store/dashboardStore";

interface NavCommand {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_COMMANDS: NavCommand[] = [
  { href: "/app", label: "대시보드", icon: LayoutDashboard },
  { href: "/app/run", label: "실행 화면", icon: Play },
  { href: "/committee", label: "AI Committee", icon: Gavel },
  { href: "/workflows", label: "워크플로우", icon: Workflow },
  { href: "/projects", label: "프로젝트", icon: FolderKanban },
  { href: "/memory", label: "메모리", icon: BrainCircuit },
  { href: "/files", label: "파일", icon: Folder },
  { href: "/tasks", label: "작업", icon: ListTodo },
  { href: "/automations", label: "자동화", icon: Zap },
  { href: "/activity", label: "활동", icon: Activity },
  { href: "/analytics", label: "분석", icon: BarChart3 },
  { href: "/settings", label: "API 키", icon: KeyRound },
  { href: "/integrations", label: "연동", icon: Plug },
  { href: "/preferences", label: "환경설정", icon: Settings },
];

export function CommandPalette() {
  const open = useDashboardStore((s) => s.commandPaletteOpen);
  const setOpen = useDashboardStore((s) => s.setCommandPaletteOpen);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen(!open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  useEffect(() => {
    // Warm every route shortly after first load, instead of each tab paying
    // its one-time Turbopack dev-compile cost only when someone actually
    // clicks into it. router.prefetch() makes the same request a real visit
    // would, so by the time you click a tab it's often already compiled.
    // A short delay keeps this from competing with the current page's own
    // initial data fetches for server CPU.
    const timer = setTimeout(() => {
      for (const item of NAV_COMMANDS) router.prefetch(item.href);
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="명령어 팔레트"
      description="이동할 명령어를 검색하세요..."
    >
      <CommandInput placeholder="이동할 페이지..." />
      <CommandList>
        <CommandEmpty>일치하는 페이지가 없습니다.</CommandEmpty>
        <CommandGroup heading="탐색">
          {NAV_COMMANDS.map((item) => (
            <CommandItem key={item.href} value={item.label} onSelect={() => go(item.href)}>
              <item.icon className="size-4" strokeWidth={1.75} />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
