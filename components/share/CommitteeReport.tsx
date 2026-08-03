"use client";

import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { CodeBlock } from "@/components/dashboard/CodeBlock";

// Same markdown setup FinalResultCard.tsx and this page's server component
// both use -- kept in sync manually (small enough that a shared module
// isn't worth it yet, see FinalResultCard.tsx's own comment).
const markdownComponents: Components = {
  p: (props) => <p className="mb-3 leading-relaxed last:mb-0" {...props} />,
  ul: (props) => <ul className="mb-3 list-disc space-y-1.5 pl-5" {...props} />,
  ol: (props) => <ol className="mb-3 list-decimal space-y-1.5 pl-5" {...props} />,
  li: (props) => <li {...props} />,
  strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
  a: (props) => <a className="text-primary underline underline-offset-2" {...props} />,
  h1: (props) => <h1 className="mb-3 mt-5 text-lg font-semibold first:mt-0" {...props} />,
  h2: (props) => <h2 className="mb-2 mt-5 text-base font-semibold first:mt-0" {...props} />,
  h3: (props) => <h3 className="mb-2 mt-4 text-[15px] font-semibold first:mt-0" {...props} />,
  blockquote: (props) => <blockquote className="mb-3 border-l-2 border-border pl-3 text-text-secondary" {...props} />,
  table: (props) => (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]" {...props} />
    </div>
  ),
  th: (props) => <th className="border-b border-border px-2 py-1.5 text-left font-semibold text-foreground" {...props} />,
  td: (props) => <td className="border-b border-border/60 px-2 py-1.5 align-top" {...props} />,
  code: ({ className, children }) => {
    const languageMatch = /language-(\w+)/.exec(className ?? "");
    if (languageMatch) {
      return <CodeBlock code={String(children).replace(/\n$/, "")} language={languageMatch[1]} />;
    }
    return <code className="rounded bg-[var(--glass-border)] px-1.5 py-0.5 font-mono text-[13px]">{children}</code>;
  },
  pre: ({ children }) => <>{children}</>,
};

/** Full report, collapsed by default -- the summary card above the fold already gives the gist; this is for whoever wants the whole thing. */
export function CommitteeReport({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-muted px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card"
      >
        <span className="flex items-center gap-2">
          <FileText className="size-4 text-text-secondary" />
          전체 리포트 {expanded ? "접기" : "펼쳐보기"}
        </span>
        {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {expanded && (
        <div className="rounded-xl border border-border bg-card/60 p-5 text-[15px] text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {text}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
