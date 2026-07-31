"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, Image as ImageIcon, Loader2, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeSelector } from "@/components/dashboard/ModeSelector";
import { PROVIDER_IDS, type KeysStatusResponse, type ProviderId } from "@/lib/config/types";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { runProvider } from "@/lib/streamClient";
import { autoRoute } from "@/lib/routing/autoRoute";
import { fetchKnowledge } from "@/lib/knowledge/client";
import { fetchFiles, fileUrl, isImageMime } from "@/lib/files/client";

interface PromptComposerProps {
  keysStatus: KeysStatusResponse | undefined;
  activeProviders: ProviderId[];
}

export function PromptComposer({ keysStatus, activeProviders }: PromptComposerProps) {
  const systemPrompt = useDashboardStore((s) => s.systemPrompt);
  const userPrompt = useDashboardStore((s) => s.userPrompt);
  const maxTokens = useDashboardStore((s) => s.maxTokens);
  const cards = useDashboardStore((s) => s.cards);
  const consensus = useDashboardStore((s) => s.consensus);
  const judgeMode = useDashboardStore((s) => s.judgeMode);
  const setSystemPrompt = useDashboardStore((s) => s.setSystemPrompt);
  const setUserPrompt = useDashboardStore((s) => s.setUserPrompt);
  const setMaxTokens = useDashboardStore((s) => s.setMaxTokens);
  const setJudgeMode = useDashboardStore((s) => s.setJudgeMode);
  const startConsensus = useDashboardStore((s) => s.startConsensus);
  const finishConsensus = useDashboardStore((s) => s.finishConsensus);
  const failConsensus = useDashboardStore((s) => s.failConsensus);
  const currentProjectId = useDashboardStore((s) => s.currentProjectId);
  const attachmentFileIds = useDashboardStore((s) => s.attachmentFileIds);
  const toggleAttachmentFileId = useDashboardStore((s) => s.toggleAttachmentFileId);

  const [routeReason, setRouteReason] = useState<string | null>(null);
  const { data: knowledgeData } = useQuery({ queryKey: ["knowledge", ""], queryFn: () => fetchKnowledge() });
  const { data: filesData } = useQuery({ queryKey: ["files"], queryFn: fetchFiles });
  const imageFiles = useMemo(() => filesData?.files.filter((f) => isImageMime(f.mimeType)) ?? [], [filesData]);
  const attachedFiles = useMemo(
    () => imageFiles.filter((f) => attachmentFileIds.includes(f.id)),
    [imageFiles, attachmentFileIds],
  );

  const configuredProviders = useMemo(
    () => activeProviders.filter((id) => keysStatus?.providers[id]?.configured),
    [activeProviders, keysStatus],
  );
  const anyRunning = PROVIDER_IDS.some((id) => cards[id].status === "running");
  const judging = consensus.status === "running";

  function routeAutomatically() {
    if (!userPrompt.trim() || !keysStatus || configuredProviders.length === 0) return;
    const decision = autoRoute(userPrompt, keysStatus, configuredProviders[0]);
    setRouteReason(decision.reason);
    toast.info(decision.reason);
    void runProvider({
      provider: decision.provider,
      model: cards[decision.provider].model,
      systemPrompt: systemPrompt || undefined,
      userPrompt,
      temperature: cards[decision.provider].temperature,
      maxTokens,
      effort: cards[decision.provider].effort,
      runGroupId: crypto.randomUUID(),
      projectId: currentProjectId,
      attachmentFileIds,
    });
  }

  function handleExecute() {
    if (judgeMode === "auto_route") {
      routeAutomatically();
    } else {
      void runAllThenJudge(judgeMode);
    }
  }

  const executeDisabled = anyRunning || judging || !userPrompt.trim() || configuredProviders.length === 0;

  /**
   * Consensus/best-answer used to only judge whatever was already sitting in
   * the cards -- if you hadn't separately pressed the page header's "전체
   * 실행" first, clicking this button just failed with a "run 2+ models
   * first" error. This runs every configured provider on the current prompt,
   * waits for them to land, then judges -- one click end to end.
   */
  async function runAllThenJudge(mode: "consensus" | "best_answer") {
    const runGroupId = crypto.randomUUID();
    const cardsAtLaunch = useDashboardStore.getState().cards;
    await Promise.all(
      configuredProviders.map((provider) =>
        runProvider({
          provider,
          model: cardsAtLaunch[provider].model,
          systemPrompt: systemPrompt || undefined,
          userPrompt,
          temperature: cardsAtLaunch[provider].temperature,
          maxTokens,
          effort: cardsAtLaunch[provider].effort,
          runGroupId,
          projectId: currentProjectId,
          attachmentFileIds,
        }),
      ),
    );
    await judge(mode);
  }

  async function judge(mode: "consensus" | "best_answer") {
    // Re-read from the store rather than the `cards` closed over at render
    // time -- runAllThenJudge just awaited fresh runs, and this component
    // hasn't necessarily re-rendered with that result yet.
    const latestCards = useDashboardStore.getState().cards;
    const responses = activeProviders
      .filter((id) => latestCards[id].status === "done" && latestCards[id].streamedText)
      .map((id) => ({ provider: id, model: latestCards[id].model, text: latestCards[id].streamedText }));
    if (responses.length < 2) {
      toast.error("채점하려면 최소 두 개 모델이 성공적으로 응답해야 합니다.");
      return;
    }
    startConsensus(mode);
    try {
      const res = await fetch("/api/consensus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runGroupId: crypto.randomUUID(), mode, responses }),
      });
      const data = (await res.json()) as { resultText?: string; error?: string };
      if (data.error) {
        failConsensus(data.error);
      } else {
        finishConsensus(data.resultText ?? "");
      }
    } catch (err) {
      failConsensus(err instanceof Error ? err.message : "알 수 없는 오류");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Accordion>
        <AccordionItem value="advanced" className="border-none">
          <AccordionTrigger className="w-fit py-0 text-xs text-text-secondary hover:no-underline">
            고급 옵션
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pt-3 sm:grid-cols-[1fr_140px]">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="system-prompt" className="text-xs text-text-secondary">
                    시스템 프롬프트
                  </Label>
                  {knowledgeData && knowledgeData.items.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center gap-1 text-xs text-text-secondary outline-none hover:text-foreground">
                        <BookOpen className="size-3" /> 지식 첨부
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        {knowledgeData.items.map((item) => (
                          <DropdownMenuItem
                            key={item.id}
                            onClick={() =>
                              setSystemPrompt(systemPrompt ? `${systemPrompt}\n\n${item.content}` : item.content)
                            }
                          >
                            {item.title}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <Input
                  id="system-prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="당신은 유용한 어시스턴트입니다..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-tokens" className="text-xs text-text-secondary">
                  최대 토큰
                </Label>
                <Input
                  id="max-tokens"
                  type="number"
                  min={256}
                  max={128_000}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value) || 4096)}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="focus-glow glass rounded-2xl transition-shadow duration-200">
        <Textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder="세 모델에게 무엇이든 물어보세요..."
          className="min-h-48 resize-none rounded-2xl border-none bg-transparent p-6 text-[17px] leading-relaxed shadow-none placeholder:text-text-secondary/70 focus-visible:ring-0"
        />
      </div>

      {routeReason && <p className="text-xs text-text-secondary">라우팅됨: {routeReason}</p>}
      {configuredProviders.length === 0 && (
        <p className="text-xs text-warning">프롬프트를 실행하려면 설정에서 API 키를 하나 이상 등록하세요.</p>
      )}

      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {attachedFiles.map((file) => (
            <span key={file.id} className="glass-chip flex items-center gap-1.5 rounded-full px-2 py-1 text-xs">
              {/* eslint-disable-next-line @next/next/no-img-element -- local file server route, not a static asset */}
              <img src={fileUrl(file.id)} alt={file.filename} className="size-4 rounded object-cover" />
              <span className="max-w-24 truncate text-foreground">{file.filename}</span>
              <button type="button" onClick={() => toggleAttachmentFileId(file.id)} className="text-text-secondary hover:text-danger">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <ModeSelector mode={judgeMode} onModeChange={setJudgeMode} disabled={anyRunning || judging} />
        {imageFiles.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1.5 text-xs text-text-secondary outline-none transition-colors hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg)] hover:text-foreground">
              <ImageIcon className="size-3.5" /> 이미지 첨부
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {imageFiles.map((file) => (
                <DropdownMenuItem key={file.id} onClick={() => toggleAttachmentFileId(file.id)} className="gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local file server route, not a static asset */}
                  <img src={fileUrl(file.id)} alt={file.filename} className="size-6 rounded object-cover" />
                  <span className="flex-1 truncate">{file.filename}</span>
                  {attachmentFileIds.includes(file.id) && <span className="text-primary">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button type="button" variant="outline" size="sm" onClick={handleExecute} disabled={executeDisabled}>
          {judging ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
          실행
        </Button>
      </div>
    </div>
  );
}
