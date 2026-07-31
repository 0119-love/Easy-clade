"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

interface CodeBlockProps {
  code: string;
  language?: string;
}

/** Real Shiki-highlighted code block, styled to read like Cursor's editor surface. */
export function CodeBlock({ code, language }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function highlight() {
      try {
        const result = await codeToHtml(code, { lang: language || "text", theme: "github-dark" });
        if (!cancelled) setHtml(result);
      } catch {
        // Unknown/partial language grammar (common mid-stream) -- fall back to plain text tokens.
        try {
          const fallback = await codeToHtml(code, { lang: "text", theme: "github-dark" });
          if (!cancelled) setHtml(fallback);
        } catch {
          if (!cancelled) setHtml(null);
        }
      }
    }

    void highlight();
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  if (html) {
    return (
      <div
        className="my-3 overflow-x-auto rounded-xl bg-[#0a0d0e] p-4 text-[13px] leading-relaxed [&>pre]:!m-0 [&>pre]:!bg-transparent [&>pre]:!p-0"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <pre className="my-3 animate-pulse overflow-x-auto rounded-xl bg-[#0a0d0e] p-4 text-[13px] leading-relaxed text-foreground">
      <code>{code}</code>
    </pre>
  );
}
