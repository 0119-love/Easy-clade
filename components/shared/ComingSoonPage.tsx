import type { LucideIcon } from "lucide-react";

interface ComingSoonPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Honest empty state for sidebar sections that aren't built yet -- never fake data or fake progress. */
export function ComingSoonPage({ icon: Icon, title, description }: ComingSoonPageProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <Icon className="size-8 text-text-secondary" strokeWidth={1.5} />
      <div className="space-y-2">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="max-w-md text-sm text-text-secondary">{description}</p>
      </div>
      <span className="text-xs font-medium text-text-secondary">출시 예정</span>
    </div>
  );
}
