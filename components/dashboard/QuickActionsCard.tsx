import Link from "next/link";
import { BookOpen, KeyRound, Play, Sparkles, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface QuickAction {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Same routes/icons as CommandPalette's and Sidebar's entries for these
// pages, so a given destination always wears the same icon everywhere.
const ACTIONS: QuickAction[] = [
  { href: "/app/run", label: "실행 화면", icon: Play },
  { href: "/agents", label: "에이전트", icon: Sparkles },
  { href: "/settings", label: "API 키", icon: KeyRound },
  { href: "/knowledge", label: "지식", icon: BookOpen },
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
            className="flex flex-col items-center gap-2 rounded-lg border border-border px-3 py-4 text-center transition-colors duration-150 hover:bg-accent/40"
          >
            <action.icon className="size-5 text-text-secondary" strokeWidth={1.75} />
            <span className="text-xs font-medium text-foreground">{action.label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
