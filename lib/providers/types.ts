import type { ProviderId } from "../config/types";

export interface ModelInfo {
  id: string;
  label: string;
  contextWindow: number;
  maxOutputTokens: number;
}

export interface Attachment {
  mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string; // base64, no data: URI prefix
}

export interface RunParams {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  attachments?: Attachment[];
}

export type StreamChunk =
  | { type: "text-delta"; text: string }
  | { type: "thinking-delta"; text: string }
  | {
      type: "done";
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
      stopReason: string;
    }
  | { type: "error"; message: string }
  // Synthesized by app/api/run/route.ts after insertRun() -- no Provider implementation yields this.
  | { type: "persisted"; runId: number };

export interface Provider {
  id: ProviderId;
  label: string;
  listModels(): Promise<ModelInfo[]>;
  streamComplete(userId: number, params: RunParams, signal: AbortSignal): AsyncIterable<StreamChunk>;
  /**
   * Real per-model pricing, keyed by the exact model id from listModels().
   * Exists so callers that need to rank/pick a model by cost (e.g. the Brain
   * orchestrator's cheapest/priciest selection) never have to assume
   * anything about how listModels() orders its array -- that assumption
   * ("first is cheapest") was wrong for 5 of 6 providers and broke Claude/
   * Gemini/ChatGPT in cost_saver and best_quality mode.
   */
  estimateCost(modelId: string, inputTokens: number, outputTokens: number): Promise<number>;
}

export interface ModelPricing {
  inputPerMTok: number;
  outputPerMTok: number;
}
