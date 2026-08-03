import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, Sparkles, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import { ProviderMark } from "@/components/ui/provider-mark";
import { CommitteeReport } from "@/components/share/CommitteeReport";
import { PROVIDER_LABELS } from "@/lib/config/types";
import { getPublicCommitteeRunByShareToken } from "@/lib/committee/queries";
import { cn } from "@/lib/utils";

const summaryMarkdownComponents: Components = {
  p: (props) => <p className="mb-2 leading-relaxed last:mb-0" {...props} />,
  ul: (props) => <ul className="space-y-2" {...props} />,
  li: ({ children, ...props }) => (
    <li className="flex items-start gap-2.5 text-[15px] leading-snug text-foreground" {...props}>
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-400" />
      <span>{children}</span>
    </li>
  ),
  strong: (props) => <strong className="font-semibold" {...props} />,
};

function scoreTier(score: number): { label: string; className: string } {
  if (score >= 90) return { label: "탁월함", className: "text-success" };
  if (score >= 75) return { label: "우수", className: "text-success" };
  if (score >= 60) return { label: "양호", className: "text-foreground" };
  return { label: "완료", className: "text-text-secondary" };
}

export default async function SharedCommitteeResultPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const run = await getPublicCommitteeRunByShareToken(token);
  if (!run) notFound();

  const tier = run.finalQualityScore !== null ? scoreTier(run.finalQualityScore) : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-foreground">
          AI Command Center
        </Link>
        <span className="text-xs text-text-secondary">AI Committee 합의 결과</span>
      </div>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-text-secondary">미션</p>
        <p className="text-xl font-semibold leading-snug text-foreground">{run.mission}</p>
        <div className="flex flex-wrap items-center gap-2">
          {run.providers.map((provider) => (
            <span
              key={provider}
              className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-text-secondary"
            >
              <ProviderMark provider={provider} size="sm" />
              {PROVIDER_LABELS[provider]}
            </span>
          ))}
        </div>
      </div>

      {run.finalQualityScore !== null && tier && (
        <Card className="flex items-center gap-4 p-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <Trophy className="size-6" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">{run.finalQualityScore}</span>
              <span className="text-sm text-text-secondary">/ 100</span>
              <span className={cn("ml-1 text-xs font-semibold", tier.className)}>{tier.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1.5 max-w-[220px] flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", run.finalQualityScore >= 75 ? "bg-success" : "bg-primary")}
                  style={{ width: `${run.finalQualityScore}%` }}
                />
              </div>
              <StarRating value={(run.finalQualityScore / 100) * 5} />
            </div>
          </div>
        </Card>
      )}

      {run.summary && (
        <Card className="space-y-3 p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-foreground">핵심 요약</h2>
          </div>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={summaryMarkdownComponents}>
            {run.summary}
          </ReactMarkdown>
        </Card>
      )}

      <CommitteeReport text={run.finalConsensusText} />

      <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-5 py-4">
        <p className="text-sm text-text-secondary">여러 AI가 서로 검증해 합의에 이른 답입니다. 직접 만들어보세요.</p>
        <Link href="/signup" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground">
          회원가입 <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
