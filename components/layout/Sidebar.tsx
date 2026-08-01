"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, Gavel, LayoutDashboard, Settings, Zap, type LucideIcon } from "lucide-react";
import { cn, emailInitials } from "@/lib/utils";
import { GLASS_SPRING } from "@/components/ui/motion-presets";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Capped at 8 -- everything else (Projects, Workflows, Memory, Files, Tasks,
// Integrations, Preferences) still exists as a real route, reachable via
// the command palette (Cmd/Ctrl+K), just not surfaced in primary nav.
const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "대시보드", icon: LayoutDashboard },
  { href: "/committee", label: "AI Committee", icon: Gavel },
  { href: "/automations", label: "자동화", icon: Zap },
  { href: "/activity", label: "활동", icon: BarChart3 },
  { href: "/settings", label: "설정", icon: Settings },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <nav className="relative flex w-56 shrink-0 flex-col overflow-hidden border-r border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-6">
      <div className="mb-8 px-3 text-[15px] font-semibold tracking-tight text-foreground">
        AI Command Center
      </div>

      <div className="relative flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          // "/app" (dashboard) must NOT stay active on "/app/run" (the run
          // console) -- startsWith("/app/") would otherwise match both.
          const active =
            item.href === "/app" ? pathname === "/app" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                active ? "text-foreground" : "text-text-secondary hover:text-foreground",
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute inset-0 rounded-full border border-[color-mix(in_oklch,var(--primary),transparent_70%)] bg-[color-mix(in_oklch,var(--primary),transparent_88%)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                  transition={GLASS_SPRING}
                />
              )}
              <Icon className="relative z-10 size-[17px] shrink-0" strokeWidth={1.75} />
              <span className="relative z-10 truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5 border-t border-[var(--glass-border)] px-3 pt-4">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          {emailInitials(userEmail)}
        </span>
        <span className="truncate text-xs text-text-secondary">{userEmail}</span>
      </div>
    </nav>
  );
}
