"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ListTodo } from "lucide-react";
import { PROVIDER_LABELS, type ProviderId } from "@/lib/config/types";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { Card } from "@/components/ui/card";
import { ProviderMark } from "@/components/ui/provider-mark";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CARD_STATUS_LABELS } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";
import { createTask } from "@/lib/tasks/client";
import { broadcastScroll, registerScrollable } from "@/lib/store/scrollSync";
import { CodeBlock } from "./CodeBlock";
import { TypingIndicator } from "./TypingIndicator";

interface ResponseColumnProps {
  provider: ProviderId;
}

/** Debounces re-parses of the streamed markdown so fast token bursts don't cause visual thrash. */
function useDebouncedText(text: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(text);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), delayMs);
    return () => clearTimeout(timer);
  }, [text, delayMs]);
  return debounced;
}

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
  blockquote: (props) => (
    <blockquote className="mb-3 border-l-2 border-border pl-3 text-text-secondary" {...props} />
  ),
  code: ({ className, children }) => {
    const languageMatch = /language-(\w+)/.exec(className ?? "");
    if (languageMatch) {
      return <CodeBlock code={String(children).replace(/\n$/, "")} language={languageMatch[1]} />;
    }
    return (
      <code className="rounded bg-[var(--glass-border)] px-1.5 py-0.5 font-mono text-[13px]">{children}</code>
    );
  },
  // Shiki's output already includes its own <pre>; don't double-wrap it.
  pre: ({ children }) => <>{children}</>,
};

export function ResponseColumn({ provider }: ResponseColumnProps) {
  const card = useDashboardStore((s) => s.cards[provider]);
  const syncScroll = useDashboardStore((s) => s.syncScroll);
  const showThinking = useDashboardStore((s) => s.showThinking);
  const debouncedText = useDebouncedText(card.streamedText, 75);
  const displayText = card.status === "running" ? debouncedText : card.streamedText;
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    registerScrollable(provider, el);
    return () => registerScrollable(provider, null);
  }, [provider]);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    if (!syncScroll) return;
    const el = e.currentTarget;
    const maxScroll = el.scrollHeight - el.clientHeight;
    broadcastScroll(provider, maxScroll > 0 ? el.scrollTop / maxScroll : 0);
  }

  async function addAsTask() {
    const title = displayText.trim().slice(0, 80).replace(/\s+/g, " ");
    try {
      await createTask(`[${PROVIDER_LABELS[provider]}] ${title}${displayText.length > 80 ? "..." : ""}`, card.runId);
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("작업에 추가되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "작업을 추가하지 못했습니다.");
    }
  }

  return (
    <Card className="flex min-h-72 flex-1 flex-col gap-3 p-6">
      <div className="mb-1 flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <ProviderMark provider={provider} size="sm" />
          <span className="text-sm font-medium text-foreground">{PROVIDER_LABELS[provider]}</span>
        </div>
        <div className="flex items-center gap-2">
          {card.status === "done" && displayText && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => void addAsTask()}
                    className="text-text-secondary hover:text-foreground"
                  >
                    <ListTodo className="size-3.5" />
                  </button>
                }
              />
              <TooltipContent>작업으로 추가</TooltipContent>
            </Tooltip>
          )}
          <span
            className={cn(
              "text-[11px]",
              card.status === "done" && "text-success",
              card.status === "error" && "text-danger",
              (card.status === "idle" || card.status === "stopped") && "text-text-secondary",
              card.status === "running" && "text-text-secondary",
            )}
          >
            {CARD_STATUS_LABELS[card.status]}
          </span>
        </div>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="max-h-[28rem] space-y-3 overflow-y-auto">
        {showThinking && card.thinkingText && (
          <p className="rounded-lg bg-[var(--glass-border)] p-3 text-[13px] italic text-text-secondary">
            {card.thinkingText}
          </p>
        )}

        {card.status === "idle" && !displayText && (
          <p className="text-[15px] text-text-secondary">실행 결과가 아직 없습니다.</p>
        )}

        {card.status === "error" && (
          <p className="text-[15px] text-danger">{card.error ?? "문제가 발생했습니다."}</p>
        )}

        {card.status === "stopped" && !displayText && (
          <p className="text-[15px] text-text-secondary">출력이 생성되기 전에 실행이 중지되었습니다.</p>
        )}

        {displayText && (
          <div className="text-[15px] text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {displayText}
            </ReactMarkdown>
          </div>
        )}

        {card.status === "running" && !displayText && <TypingIndicator />}
      </div>
    </Card>
  );
}
