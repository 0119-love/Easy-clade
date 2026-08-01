import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProviderMark } from "@/components/ui/provider-mark";
import { PROVIDER_LABELS, type ProviderId } from "@/lib/config/types";
import { cn } from "@/lib/utils";

// Marketing copy only -- this renders on the logged-out landing page, so
// there's no real per-user connection status/usage data to show (unlike an
// authenticated dashboard card). A short tagline + signup CTA instead of
// fabricated stats.
const PROVIDER_TAGLINES: Record<ProviderId, string> = {
  anthropic: "정교한 추론과 코딩에 강한 모델",
  openai: "범용성이 뛰어난 대화형 모델",
  google: "멀티모달·긴 컨텍스트에 강한 모델",
  xai: "실시간성과 개성 있는 응답",
  perplexity: "실시간 웹 검색 기반 답변",
  deepseek: "가성비 좋은 추론 모델",
};

export function ProviderHoverCard({ provider }: { provider: ProviderId }) {
  return (
    <div className="glass-popover flex w-56 flex-col gap-3 rounded-xl p-4">
      <div className="flex items-center gap-2.5">
        <ProviderMark provider={provider} size="sm" />
        <span className="text-sm font-semibold text-foreground">{PROVIDER_LABELS[provider]}</span>
      </div>
      <p className="text-xs text-text-secondary">{PROVIDER_TAGLINES[provider]}</p>
      <Link href="/signup" className={cn(buttonVariants({ size: "sm" }), "h-9 justify-center rounded-[10px]")}>
        시작하기 <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
