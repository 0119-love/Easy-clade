import type { ProviderId } from "../config/types";

export type CommitteeStage = "prompt_optimize" | "initial_draft" | "cross_review" | "self_reflect" | "judge";

export type CommitteeRunStatus = "running" | "success" | "error" | "stopped";
export type CommitteeStepStatus = "success" | "error";

export interface CommitteeContext {
  targetUsers: string;
  style: string;
  techStack: string;
  specialRequirements: string;
}

export function emptyCommitteeContext(): CommitteeContext {
  return { targetUsers: "", style: "", techStack: "", specialRequirements: "" };
}

export interface CommitteeRunRequest {
  mission: string;
  context: CommitteeContext;
  providers: ProviderId[];
  targetQualityScore: number;
  maxLoops: number;
}

export interface CommitteeStepRequest {
  action: CommitteeStage;
  /** Required for every action except "judge" (which covers all active providers in one call). */
  provider?: ProviderId;
  /** 0 for prompt_optimize/initial_draft (pre-loop stages). */
  loopNumber: number;
}

export interface CommitteeStepResult {
  status: CommitteeStepStatus;
  responseText: string | null;
  errorMessage: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  /** Only present for the "judge" action. */
  qualityScore?: number | null;
}

export interface CommitteeFinalizeRequest {
  status: "success" | "error" | "stopped";
  finalConsensusText: string | null;
  finalQualityScore: number | null;
  bestLoopNumber: number | null;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  errorMessage?: string | null;
}
