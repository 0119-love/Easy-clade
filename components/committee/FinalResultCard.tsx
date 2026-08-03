"use client";

import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import { CodeBlock } from "@/components/dashboard/CodeBlock";
import type { CommitteeRunUiStatus } from "@/lib/store/committeeStore";

// Same markdown rendering setup as ResponseColumn.tsx, kept in sync manually
// (small enough that extracting a shared module isn't worth it yet).
const markdownComponents: Components = {
  p: (props) => <p className="mb-3 leading-relaxed last:mb-0" {...props} />,
  ul: (props) => <ul className="mb-3 list-disc space-y-1.5 pl-5" {...props} />,
  ol: (props) => <ol className="mb-3 list-decimal space-y-1.5 pl-5" {...props} />,
  li: (props) => <li {...props} />,
  strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
  a: (props) => <a className="text-primary underline underline-offset-2" {...props} />,
  h1: (props) => <h1 className="mb-3 mt-4 text-lg font-semibold first:mt-0" {...props} />,
  h2: (props) => <h2 className="mb-2 mt-4 text-base font-semibold first:mt-0" {...props} />,
  h3: (props) => <h3 className="mb-2 mt-3 text-[15px] font-semibold first:mt-0" {...props} />,
  blockquote: (props) => <blockquote className="mb-3 border-l-2 border-border pl-3 text-text-secondary" {...props} />,
  code: ({ className, children }) => {
    const languageMatch = /language-(\w+)/.exec(className ?? "");
    if (languageMatch) {
      return <CodeBlock code={String(children).replace(/\n$/, "")} language={languageMatch[1]} />;
    }
    return <code className="rounded bg-[var(--glass-border)] px-1.5 py-0.5 font-mono text-[13px]">{children}</code>;
  },
  pre: ({ children }) => <>{children}</>,
};

interface FinalResultCardProps {
  status: CommitteeRunUiStatus;
  committeeRunId: number | null;
  finalConsensusText: string | null;
  finalQualityScore: number | null;
  bestLoopNumber: number | null;
  errorMessage: string | null;
}

export function FinalResultCard({
  status,
  committeeRunId,
  finalConsensusText,
  finalQualityScore,
  bestLoopNumber,
  errorMessage,
}: FinalResultCardProps) {
  const [sharing, setSharing] = useState(false);

  if (status === "idle" || status === "running") return null;

  async function handleShare() {
    if (!committeeRunId || sharing) return;
    setSharing(true);
    try {
      const res = await fetch(`/api/committee/${committeeRunId}/share`, { method: "POST" });
      const data = (await res.json()) as { shareToken?: string; error?: string };
      if (!res.ok || !data.shareToken) {
        toast.error(data.error ?? "공유 링크를 만들지 못했습니다.");
        return;
      }
      const url = `${window.location.origin}/share/committee/${data.shareToken}`;
      await navigator.clipboard.writeText(url);
      toast.success("공유 링크를 클립보드에 복사했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "알 수 없는 오류로 공유 링크를 만들지 못했습니다.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">최종 결과</h2>
        <div className="flex items-center gap-3">
          {bestLoopNumber !== null && <span className="text-xs text-text-secondary">Loop {bestLoopNumber} 기준</span>}
          {finalConsensusText && (
            <Button type="button" size="sm" variant="outline" onClick={handleShare} disabled={sharing}>
              <Link2 className="size-3.5" /> {sharing ? "만드는 중..." : "공유 링크"}
            </Button>
          )}
        </div>
      </div>

      {!finalConsensusText ? (
        <p className="whitespace-pre-line text-sm text-danger">{errorMessage ?? "표시할 결과가 없습니다."}</p>
      ) : (
        <>
          {finalQualityScore !== null && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-semibold text-foreground">{finalQualityScore}/100</span>
              <StarRating value={(finalQualityScore / 100) * 5} />
            </div>
          )}
          <div className="text-[15px] text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {finalConsensusText}
            </ReactMarkdown>
          </div>
          {status === "stopped" && (
            <p className="text-xs text-text-secondary">
              사용자가 중지했습니다 -- 지금까지 나온 결과 중 가장 점수가 높았던 루프를 보여줍니다.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
