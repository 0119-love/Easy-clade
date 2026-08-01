import { create } from "zustand";
import type { ProviderId } from "../config/types";
import type { CommitteeContext, CommitteeStage } from "../committee/types";
import { emptyCommitteeContext } from "../committee/types";
import { DEFAULT_MAX_LOOPS, DEFAULT_TARGET_QUALITY_SCORE } from "../committee/defaults";

export type StepUiStatus = "pending" | "running" | "success" | "error";
export type CommitteeRunUiStatus = "idle" | "running" | "success" | "error" | "stopped";

export interface StageCallUiState {
  loopNumber: number;
  stage: CommitteeStage;
  provider: ProviderId | null; // null for the judge stage (one call covers everyone)
  status: StepUiStatus;
  startedAtMs: number | null;
  errorMessage?: string;
}

export interface CommitteeLoopUiState {
  loopNumber: number;
  status: "success" | "error";
  qualityScore: number | null;
  consensusText: string | null;
  participatingProviders: ProviderId[];
  excludedProviders: ProviderId[];
}

export function stageKey(loopNumber: number, stage: CommitteeStage, provider: ProviderId | null): string {
  return `${loopNumber}:${stage}:${provider ?? "judge"}`;
}

interface CommitteeState {
  // Config -- edited by MissionComposer before a run starts.
  mission: string;
  context: CommitteeContext;
  selectedProviders: ProviderId[];
  targetQualityScore: number;
  maxLoops: number;

  // Run state
  committeeRunId: number | null;
  runStatus: CommitteeRunUiStatus;
  currentLoop: number;
  optimizedMission: string | null;
  estimatedCostUsd: number;
  estimatedSeconds: number;

  stageCalls: Record<string, StageCallUiState>;
  loops: CommitteeLoopUiState[];
  finalConsensusText: string | null;
  finalQualityScore: number | null;
  bestLoopNumber: number | null;
  errorMessage: string | null;

  setMission: (mission: string) => void;
  setContext: (context: Partial<CommitteeContext>) => void;
  toggleProvider: (provider: ProviderId) => void;
  setTargetQualityScore: (value: number) => void;
  setMaxLoops: (value: number) => void;

  reset: () => void;
  start: (committeeRunId: number, estimatedCostUsd: number, estimatedSeconds: number) => void;
  setCurrentLoop: (loopNumber: number) => void;
  setOptimizedMission: (text: string | null) => void;
  setStageStatus: (
    loopNumber: number,
    stage: CommitteeStage,
    provider: ProviderId | null,
    status: StepUiStatus,
    errorMessage?: string,
  ) => void;
  completeLoop: (loop: CommitteeLoopUiState) => void;
  finish: (status: CommitteeRunUiStatus, finalConsensusText: string | null, finalQualityScore: number | null, bestLoopNumber: number | null) => void;
  fail: (message: string) => void;
}

export const useCommitteeStore = create<CommitteeState>((set) => ({
  mission: "",
  context: emptyCommitteeContext(),
  selectedProviders: [],
  targetQualityScore: DEFAULT_TARGET_QUALITY_SCORE,
  maxLoops: DEFAULT_MAX_LOOPS,

  committeeRunId: null,
  runStatus: "idle",
  currentLoop: 0,
  optimizedMission: null,
  estimatedCostUsd: 0,
  estimatedSeconds: 0,
  stageCalls: {},
  loops: [],
  finalConsensusText: null,
  finalQualityScore: null,
  bestLoopNumber: null,
  errorMessage: null,

  setMission: (mission) => set({ mission }),
  setContext: (context) => set((state) => ({ context: { ...state.context, ...context } })),
  toggleProvider: (provider) =>
    set((state) => ({
      selectedProviders: state.selectedProviders.includes(provider)
        ? state.selectedProviders.filter((p) => p !== provider)
        : [...state.selectedProviders, provider],
    })),
  setTargetQualityScore: (value) => set({ targetQualityScore: value }),
  setMaxLoops: (value) => set({ maxLoops: value }),

  reset: () =>
    set({
      committeeRunId: null,
      runStatus: "idle",
      currentLoop: 0,
      optimizedMission: null,
      estimatedCostUsd: 0,
      estimatedSeconds: 0,
      stageCalls: {},
      loops: [],
      finalConsensusText: null,
      finalQualityScore: null,
      bestLoopNumber: null,
      errorMessage: null,
    }),

  start: (committeeRunId, estimatedCostUsd, estimatedSeconds) =>
    set({ committeeRunId, runStatus: "running", estimatedCostUsd, estimatedSeconds }),

  setCurrentLoop: (loopNumber) => set({ currentLoop: loopNumber }),
  setOptimizedMission: (text) => set({ optimizedMission: text }),

  setStageStatus: (loopNumber, stage, provider, status, errorMessage) =>
    set((state) => {
      const key = stageKey(loopNumber, stage, provider);
      const existing = state.stageCalls[key];
      return {
        stageCalls: {
          ...state.stageCalls,
          [key]: {
            loopNumber,
            stage,
            provider,
            status,
            startedAtMs: status === "running" ? Date.now() : (existing?.startedAtMs ?? null),
            errorMessage,
          },
        },
      };
    }),

  completeLoop: (loop) => set((state) => ({ loops: [...state.loops.filter((l) => l.loopNumber !== loop.loopNumber), loop] })),

  finish: (status, finalConsensusText, finalQualityScore, bestLoopNumber) =>
    set({ runStatus: status, finalConsensusText, finalQualityScore, bestLoopNumber }),

  fail: (message) => set({ runStatus: "error", errorMessage: message }),
}));
