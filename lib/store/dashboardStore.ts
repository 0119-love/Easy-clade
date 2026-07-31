import { create } from "zustand";
import type { ProviderId } from "../config/types";

export type RunStatus = "idle" | "running" | "done" | "error" | "stopped";
export type EffortLevel = "low" | "medium" | "high" | "xhigh" | "max";
export type JudgeMode = "consensus" | "best_answer" | "auto_route";

export interface RunMetrics {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
}

export interface CardState {
  model: string;
  temperature: number;
  effort: EffortLevel;
  status: RunStatus;
  streamedText: string;
  thinkingText: string;
  error: string | null;
  metrics: RunMetrics | null;
  runId: number | null;
}

interface ConsensusState {
  status: "idle" | "running" | "done" | "error";
  mode: "consensus" | "best_answer" | null;
  resultText: string | null;
  error: string | null;
}

function defaultCard(model: string): CardState {
  return {
    model,
    temperature: 1,
    effort: "medium",
    status: "idle",
    streamedText: "",
    thinkingText: "",
    error: null,
    metrics: null,
    runId: null,
  };
}

interface DashboardState {
  cards: Record<ProviderId, CardState>;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  syncScroll: boolean;
  showThinking: boolean;
  commandPaletteOpen: boolean;
  consensus: ConsensusState;
  judgeMode: JudgeMode;
  currentProjectId: number | null;
  attachmentFileIds: number[];

  setUserPrompt: (value: string) => void;
  setSystemPrompt: (value: string) => void;
  setMaxTokens: (value: number) => void;
  setSyncScroll: (value: boolean) => void;
  setShowThinking: (value: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setJudgeMode: (mode: JudgeMode) => void;
  setCurrentProjectId: (id: number | null) => void;
  toggleAttachmentFileId: (id: number) => void;
  clearAttachmentFileIds: () => void;

  applyPreset: (preset: {
    provider: ProviderId;
    model: string;
    systemPrompt: string | null;
    temperature: number;
    effort: EffortLevel;
  }) => void;
  setCardModel: (provider: ProviderId, model: string) => void;
  setCardTemperature: (provider: ProviderId, temperature: number) => void;
  setCardEffort: (provider: ProviderId, effort: EffortLevel) => void;
  startRun: (provider: ProviderId) => void;
  appendText: (provider: ProviderId, delta: string) => void;
  appendThinking: (provider: ProviderId, delta: string) => void;
  finishRun: (provider: ProviderId, metrics: RunMetrics) => void;
  setCardRunId: (provider: ProviderId, runId: number) => void;
  failRun: (provider: ProviderId, message: string) => void;
  stopRun: (provider: ProviderId) => void;
  resetCard: (provider: ProviderId) => void;

  startConsensus: (mode: "consensus" | "best_answer") => void;
  finishConsensus: (resultText: string) => void;
  failConsensus: (message: string) => void;
  resetConsensus: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  cards: {
    anthropic: defaultCard("claude-sonnet-5"),
    openai: defaultCard("gpt-5.4"),
    google: defaultCard("gemini-3.5-flash"),
    xai: defaultCard("grok-5"),
    perplexity: defaultCard("sonar-pro"),
    deepseek: defaultCard("deepseek-chat"),
  },
  systemPrompt: "",
  userPrompt: "",
  maxTokens: 4096,
  syncScroll: true,
  showThinking: true,
  commandPaletteOpen: false,
  consensus: { status: "idle", mode: null, resultText: null, error: null },
  judgeMode: "consensus",
  currentProjectId: null,
  attachmentFileIds: [],

  setUserPrompt: (value) => set({ userPrompt: value }),
  setSystemPrompt: (value) => set({ systemPrompt: value }),
  setMaxTokens: (value) => set({ maxTokens: value }),
  setSyncScroll: (value) => set({ syncScroll: value }),
  setShowThinking: (value) => set({ showThinking: value }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setJudgeMode: (mode) => set({ judgeMode: mode }),
  setCurrentProjectId: (id) => set({ currentProjectId: id }),
  toggleAttachmentFileId: (id) =>
    set((state) => ({
      attachmentFileIds: state.attachmentFileIds.includes(id)
        ? state.attachmentFileIds.filter((existing) => existing !== id)
        : [...state.attachmentFileIds, id],
    })),
  clearAttachmentFileIds: () => set({ attachmentFileIds: [] }),

  applyPreset: (preset) =>
    set((state) => ({
      systemPrompt: preset.systemPrompt ?? state.systemPrompt,
      cards: {
        ...state.cards,
        [preset.provider]: {
          ...state.cards[preset.provider],
          model: preset.model,
          temperature: preset.temperature,
          effort: preset.effort,
        },
      },
    })),

  setCardModel: (provider, model) =>
    set((state) => ({ cards: { ...state.cards, [provider]: { ...state.cards[provider], model } } })),

  setCardTemperature: (provider, temperature) =>
    set((state) => ({ cards: { ...state.cards, [provider]: { ...state.cards[provider], temperature } } })),

  setCardEffort: (provider, effort) =>
    set((state) => ({ cards: { ...state.cards, [provider]: { ...state.cards[provider], effort } } })),

  startRun: (provider) =>
    set((state) => ({
      cards: {
        ...state.cards,
        [provider]: {
          ...state.cards[provider],
          status: "running",
          streamedText: "",
          thinkingText: "",
          error: null,
          metrics: null,
          runId: null,
        },
      },
    })),

  appendText: (provider, delta) =>
    set((state) => ({
      cards: {
        ...state.cards,
        [provider]: { ...state.cards[provider], streamedText: state.cards[provider].streamedText + delta },
      },
    })),

  appendThinking: (provider, delta) =>
    set((state) => ({
      cards: {
        ...state.cards,
        [provider]: { ...state.cards[provider], thinkingText: state.cards[provider].thinkingText + delta },
      },
    })),

  finishRun: (provider, metrics) =>
    set((state) => ({
      cards: { ...state.cards, [provider]: { ...state.cards[provider], status: "done", metrics } },
    })),

  setCardRunId: (provider, runId) =>
    set((state) => ({ cards: { ...state.cards, [provider]: { ...state.cards[provider], runId } } })),

  failRun: (provider, message) =>
    set((state) => ({
      cards: { ...state.cards, [provider]: { ...state.cards[provider], status: "error", error: message } },
    })),

  stopRun: (provider) =>
    set((state) => ({
      cards: { ...state.cards, [provider]: { ...state.cards[provider], status: "stopped" } },
    })),

  resetCard: (provider) =>
    set((state) => ({ cards: { ...state.cards, [provider]: defaultCard(state.cards[provider].model) } })),

  startConsensus: (mode) => set({ consensus: { status: "running", mode, resultText: null, error: null } }),
  finishConsensus: (resultText) =>
    set((state) => ({ consensus: { ...state.consensus, status: "done", resultText } })),
  failConsensus: (message) =>
    set((state) => ({ consensus: { ...state.consensus, status: "error", error: message } })),
  resetConsensus: () => set({ consensus: { status: "idle", mode: null, resultText: null, error: null } }),
}));
