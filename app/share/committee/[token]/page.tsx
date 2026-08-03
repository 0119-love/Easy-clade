import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import { ProviderMark } from "@/components/ui/provider-mark";
import { CodeBlock } from "@/components/dashboard/CodeBlock";
import { PROVIDER_LABELS } from "@/lib/config/types";
import { getPublicCommitteeRunByShareToken } from "@/lib/committee/queries";

// Same markdown setup as FinalResultCard.tsx -- kept in sync manually (see
// that file's comment); this is the one place it needs to render with no
// session, so it can't just import the dashboard component tree directly.
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

export default async function SharedCommitteeResultPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const run = await getPublicCommitteeRunByShareToken(token);
  if (!run) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-foreground">
          AI Command Center
        </Link>
        <span className="text-xs text-text-secondary">AI Committee 합의 결과</span>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-text-secondary">미션</p>
        <p className="text-lg font-semibold leading-snug text-foreground">{run.mission}</p>
      </div>

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

      <Card className="space-y-4 p-6">
        {run.finalQualityScore !== null && (
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-semibold text-foreground">{run.finalQualityScore}/100</span>
            <StarRating value={(run.finalQualityScore / 100) * 5} />
          </div>
        )}
        <div className="text-[15px] text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {run.finalConsensusText}
          </ReactMarkdown>
        </div>
      </Card>

      <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-5 py-4">
        <p className="text-sm text-text-secondary">
          여러 AI가 서로 검증해 합의에 이른 답입니다. 직접 만들어보세요.
        </p>
        <Link href="/signup" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground">
          회원가입 <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
