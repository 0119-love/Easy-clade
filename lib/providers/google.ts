import { FinishReason, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { getRawKey } from "../config/keysStore";
import { computeGoogleCost } from "./pricing/google";
import type { ModelInfo, Provider, RunParams, StreamChunk } from "./types";

// Context/output limits extrapolated from the stable pattern across the Gemini
// 1.5/2.0/2.5 generations (1,048,576 input / 65,536 output) -- current docs list
// pricing and stability tier but not per-model token limits.
const MODELS: ModelInfo[] = [
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", contextWindow: 1_048_576, maxOutputTokens: 65_536 },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", contextWindow: 1_048_576, maxOutputTokens: 65_536 },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", contextWindow: 1_048_576, maxOutputTokens: 65_536 },
];

const REFUSAL_FINISH_REASONS = new Set<FinishReason>([
  FinishReason.SAFETY,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.BLOCKLIST,
  FinishReason.SPII,
]);

// Gemini's ThinkingLevel enum tops out at HIGH -- there's no xhigh/max tier,
// so both collapse to HIGH rather than erroring or silently dropping effort.
const THINKING_LEVEL_MAP: Record<"low" | "medium" | "high" | "xhigh" | "max", ThinkingLevel> = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
  xhigh: ThinkingLevel.HIGH,
  max: ThinkingLevel.HIGH,
};

async function* streamComplete(userId: number, params: RunParams, signal: AbortSignal): AsyncIterable<StreamChunk> {
  const apiKey = await getRawKey(userId, "google");
  if (!apiKey) {
    yield { type: "error", message: "등록된 Google API 키가 없습니다." };
    return;
  }

  const client = new GoogleGenAI({ apiKey });
  const maxOutputTokens = Math.min(params.maxTokens ?? 4096, 65_536);

  try {
    const stream = await client.models.generateContentStream({
      model: params.model,
      contents: params.attachments?.length
        ? [
            { text: params.userPrompt },
            ...params.attachments.map((a) => ({ inlineData: { data: a.data, mimeType: a.mimeType } })),
          ]
        : params.userPrompt,
      config: {
        systemInstruction: params.systemPrompt,
        temperature: params.temperature,
        maxOutputTokens,
        abortSignal: signal,
        ...(params.effort ? { thinkingConfig: { thinkingLevel: THINKING_LEVEL_MAP[params.effort] } } : {}),
      },
    });

    let inputTokens = 0;
    let outputTokens = 0;
    let finishReason: FinishReason | undefined;

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        yield { type: "text-delta", text };
      }
      if (chunk.usageMetadata) {
        inputTokens = chunk.usageMetadata.promptTokenCount ?? inputTokens;
        outputTokens = chunk.usageMetadata.candidatesTokenCount ?? outputTokens;
      }
      const candidateFinish = chunk.candidates?.[0]?.finishReason;
      if (candidateFinish) finishReason = candidateFinish;
    }

    if (finishReason && REFUSAL_FINISH_REASONS.has(finishReason)) {
      yield { type: "error", message: `Gemini가 응답을 거부했습니다 (${finishReason}).` };
      return;
    }

    yield {
      type: "done",
      inputTokens,
      outputTokens,
      costUsd: computeGoogleCost(params.model, inputTokens, outputTokens),
      stopReason: finishReason ?? "STOP",
    };
  } catch (err) {
    if (signal.aborted) return; // Stop button -- the route handler records this as "stopped", not an error
    const message = err instanceof Error ? err.message : "알 수 없는 Google 오류";
    yield { type: "error", message };
  }
}

export const googleProvider: Provider = {
  id: "google",
  label: "Gemini",
  async listModels() {
    return MODELS;
  },
  streamComplete,
};
