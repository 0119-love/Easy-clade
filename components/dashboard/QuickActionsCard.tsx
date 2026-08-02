import Link from "next/link";
import { Gavel, KeyRound, Play, Zap, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QuickAction {
  href: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  // Icon-chip only -- the tile itself stays on the flat border/background
  // every other card uses, so this is the only color on this component.
  gradient: string;
}

// Same routes/icons as CommandPalette's and Sidebar's entries for these
// pages, so a given destination always wears the same icon everywhere.
const ACTIONS: QuickAction[] = [
  { href: "/app/run", label: "실행 화면", subtitle: "새 프롬프트 실행", icon: Play, gradient: "from-violet-500 to-indigo-600" },
  { href: "/committee", label: "AI Committee", subtitle: "다중 모델 합의", icon: Gavel, gradient: "from-amber-500 to-orange-600" },
  { href: "/settings", label: "API 키", subtitle: "프로바이더 키 관리", icon: KeyRound, gradient: "from-emerald-500 to-teal-600" },
  { href: "/automations", label: "자동화", subtitle: "예약 실행 설정", icon: Zap, gradient: "from-sky-500 to-blue-600" },
];

export function QuickActionsCard() {
  return (
    <Card className="space-y-4 p-6">
      <h2 className="text-sm font-semibold text-foreground">빠른 작업</h2>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-start gap-3 rounded-lg border border-border px-3 py-3 transition-colors duration-150 hover:bg-accent/40"
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-white",
                action.gradient,
              )}
            >
              <action.icon className="size-4.5" strokeWidth={1.75} />
            </span>
            <span className="flex flex-col">
              <span className="text-xs font-medium text-foreground">{action.label}</span>
              <span className="text-[11px] text-text-secondary">{action.subtitle}</span>
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
