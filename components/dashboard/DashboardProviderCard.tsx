import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/ui/sparkline";
import { buttonVariants } from "@/components/ui/button";
import { ProviderSquareBadge } from "@/components/dashboard/ProviderSquareBadge";
import { PROVIDER_LABELS, PROVIDER_META, type ProviderId, type ProviderKeyStatus } from "@/lib/config/types";
import { providerStatusTone, PROVIDER_STATUS_LABELS, type ProviderStatusTone } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";

interface DashboardProviderCardProps {
  provider: ProviderId;
  /** Count, not a specific model name -- there's no persisted "default model"
   * per provider server-side (only the run console's own ephemeral client
   * selection), so naming one specific model here would misrepresent it as
   * more fixed/current than it actually is. */
  modelCount: number;
  keyStatus: ProviderKeyStatus | undefined;
  todayTokens: number;
  todayRunCount: number;
  sparklineData: number[];
  isLoading?: boolean;
}

const STATUS_BADGE_CLASS: Record<ProviderStatusTone, string> = {
  online: "border-transparent bg-success/15 text-success",
  error: "border-transparent bg-destructive/12 text-destructive",
  unconfigured: "border-transparent bg-muted text-muted-foreground",
};

export function DashboardProviderCard({
  provider,
  modelCount,
  keyStatus,
  todayTokens,
  todayRunCount,
  sparklineData,
  isLoading,
}: DashboardProviderCardProps) {
  const tone = providerStatusTone(keyStatus);
  const colorVar = PROVIDER_META[provider].colorVar;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <ProviderSquareBadge provider={provider} />
          <div className="min-w-0 space-y-0.5">
            <div className="text-sm font-semibold text-foreground">{PROVIDER_LABELS[provider]}</div>
            {isLoading ? (
              <Skeleton className="h-3 w-16" />
            ) : (
              <div className="truncate text-xs text-text-secondary">
                {modelCount > 0 ? `모델 ${modelCount}개` : "모델 정보 없음"}
              </div>
            )}
          </div>
        </div>
        <Badge variant="outline" className={cn("shrink-0", STATUS_BADGE_CLASS[tone])}>
          {PROVIDER_STATUS_LABELS[tone]}
        </Badge>
      </div>

      {isLoading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div>
          <div className="font-mono text-2xl font-semibold text-foreground">{todayTokens.toLocaleString()}</div>
          <div className="text-xs text-text-secondary">오늘 토큰 · {todayRunCount.toLocaleString()}회 실행</div>
        </div>
      )}

      <Sparkline data={sparklineData} color={`var(${colorVar})`} height={36} />

      <Link
        href={`/app/run?provider=${provider}`}
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full")}
      >
        대화 열기 <ArrowRight className="size-3.5" />
      </Link>
    </Card>
  );
}
