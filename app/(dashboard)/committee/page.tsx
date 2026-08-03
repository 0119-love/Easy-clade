"use client";

import { Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MissionComposer } from "@/components/committee/MissionComposer";
import { PipelineStages, type PipelineSlot } from "@/components/committee/PipelineStages";
import { LiveLoopInspector } from "@/components/committee/LiveLoopInspector";
import { LiveLoopTimeline } from "@/components/committee/LiveLoopTimeline";
import { FinalResultCard } from "@/components/committee/FinalResultCard";
import { useSystemStatus } from "@/lib/hooks/useSystemStatus";
import { useCommitteeStore, stageKey } from "@/lib/store/committeeStore";
import { stopCommittee } from "@/lib/committee/client";
import type { CommitteeStage } from "@/lib/committee/types";

// judge has no per-provider dimension (one call covers everyone this loop),
// so it's checked separately from the per-provider stages below. Typed to
// exactly these two literals (not the full CommitteeStage union) so they
// stay assignable to PipelineSlot without a cast.
const PER_PROVIDER_STAGES: Array<"cross_review" | "self_reflect"> = ["cross_review", "self_reflect"];

export default function CommitteePage() {
  const status = useSystemStatus();
  const runStatus = useCommitteeStore((s) => s.runStatus);
  const committeeRunId = useCommitteeStore((s) => s.committeeRunId);
  const currentLoop = useCommitteeStore((s) => s.currentLoop);
  const maxLoops = useCommitteeStore((s) => s.maxLoops);
  const selectedProviders = useCommitteeStore((s) => s.selectedProviders);
  const stageCalls = useCommitteeStore((s) => s.stageCalls);
  const loops = useCommitteeStore((s) => s.loops);
  const finalConsensusText = useCommitteeStore((s) => s.finalConsensusText);
  const finalQualityScore = useCommitteeStore((s) => s.finalQualityScore);
  const bestLoopNumber = useCommitteeStore((s) => s.bestLoopNumber);
  const errorMessage = useCommitteeStore((s) => s.errorMessage);

  const started = runStatus !== "idle";

  // Derive which pipeline slot is active right now from the flat stageCalls
  // map -- there's no separate "current stage" field in the store, it's
  // always computed from whichever stage-calls currently show "running".
  let activeSlot: PipelineSlot | "idle" | "done" = "idle";
  let activeStage: CommitteeStage | null = null;

  if (runStatus === "success" || runStatus === "error" || runStatus === "stopped") {
    activeSlot = "done";
  } else if (runStatus === "running") {
    const optimizing = stageCalls[stageKey(0, "prompt_optimize", null)]?.status === "running";
    const drafting = selectedProviders.some((p) => stageCalls[stageKey(0, "initial_draft", p)]?.status === "running");
    if (optimizing || drafting || currentLoop === 0) {
      activeSlot = "start";
    } else {
      const judgeRunning = stageCalls[stageKey(currentLoop, "judge", null)]?.status === "running";
      const runningStage = PER_PROVIDER_STAGES.find((stage) =>
        selectedProviders.some((p) => stageCalls[stageKey(currentLoop, stage, p)]?.status === "running"),
      );
      if (judgeRunning) {
        activeSlot = "judge";
      } else if (runningStage) {
        activeSlot = runningStage;
        activeStage = runningStage;
      } else {
        // Brief gap between stages -- show the latest stage with any recorded data so the stepper doesn't flicker back to "start".
        for (const stage of [...PER_PROVIDER_STAGES].reverse()) {
          if (selectedProviders.some((p) => stageCalls[stageKey(currentLoop, stage, p)])) {
            activeSlot = stage;
            activeStage = stage;
            break;
          }
        }
      }
    }
  }

  const retrying = Object.values(stageCalls).some((c) => c.status === "error" && c.loopNumber === currentLoop);

  return (
    <div className="max-w-4xl space-y-6 px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-foreground">AI Committee Engine</h1>
          <p className="text-sm text-text-secondary">여러 AI가 서로 검토하고 다듬어가며 하나의 답을 만들어냅니다.</p>
        </div>
        {runStatus === "running" && (
          <Button type="button" variant="destructive" onClick={() => stopCommittee()}>
            <Square className="size-4" /> 중지
          </Button>
        )}
      </div>

      <MissionComposer keysStatus={status.data} />

      {started && (
        <>
          <PipelineStages activeSlot={activeSlot} retrying={retrying} />
          <LiveLoopInspector
            providers={selectedProviders}
            currentLoop={currentLoop}
            maxLoops={maxLoops}
            activeStage={activeStage}
            stageCalls={stageCalls}
            loops={loops}
          />
          <LiveLoopTimeline loops={loops} currentLoop={currentLoop} maxLoops={maxLoops} allProviders={selectedProviders} />
          <FinalResultCard
            status={runStatus}
            committeeRunId={committeeRunId}
            finalConsensusText={finalConsensusText}
            finalQualityScore={finalQualityScore}
            bestLoopNumber={bestLoopNumber}
            errorMessage={errorMessage}
          />
        </>
      )}
    </div>
  );
}
