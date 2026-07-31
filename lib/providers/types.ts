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
}

export interface ModelPricing {
  inputPerMTok: number;
  outputPerMTok: number;
}
