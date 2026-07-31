import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderMark } from "@/components/ui/provider-mark";
import { PROVIDER_LABELS } from "@/lib/config/types";
import { HISTORY_STATUS_LABELS, formatRelativeTimeKo } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";
import type { DashboardActivityItem } from "@/app/api/analytics/dashboard/route";

interface RecentActivityCardProps {
  items: DashboardActivityItem[] | undefined;
  isLoading?: boolean;
}

const STATUS_DOT_CLASS: Record<DashboardActivityItem["status"], string> = {
  success: "bg-success",
  error: "bg-danger",
  stopped: "bg-muted-foreground",
};

export function RecentActivityCard({ items, isLoading }: RecentActivityCardProps) {
  return (
    <Card className="space-y-4 p-6">
      <h2 className="text-sm font-semibold text-foreground">최근 활동</h2>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <p className="text-sm text-text-secondary">아직 실행 기록이 없습니다. 실행 화면에서 첫 프롬프트를 실행해보세요.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <ProviderMark provider={item.provider} size="sm" />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">{PROVIDER_LABELS[item.provider]}</span>
                  <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT_CLASS[item.status])} />
                  <span className="text-xs text-text-secondary">{HISTORY_STATUS_LABELS[item.status]}</span>
                  {item.projectName && <span className="truncate text-xs text-text-secondary">· {item.projectName}</span>}
                </div>
                <p className="truncate text-xs text-text-secondary">{item.userPromptPreview}</p>
              </div>
              <span className="shrink-0 text-xs text-text-secondary">{formatRelativeTimeKo(item.startedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
