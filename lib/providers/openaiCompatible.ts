import OpenAI from "openai";
import { getRawKey } from "../config/keysStore";
import { streamOpenAiCompatible } from "./openAiCompatibleStream";
import type { ModelInfo, Provider, RunParams, StreamChunk } from "./types";
import type { ProviderId } from "../config/types";

/**
 * Shared adapter for vendors that expose an OpenAI Chat Completions-shaped
 * API (a different, older, simpler surface than the Responses API
 * lib/providers/openai.ts itself uses for the real OpenAI product) -- xAI's
 * Grok, Perplexity, and DeepSeek all publish "point the OpenAI SDK at our
 * baseURL" compatibility, so one adapter covers all three instead of
 * duplicating the streaming loop per vendor. Assumes a static, hand-curated
 * model list + pricing table baked in at import time -- OpenRouter does NOT
 * use this factory (see lib/providers/openrouter.ts) because its 100+
 * models and their pricing come from a live catalog endpoint instead.
 */
export function createOpenAiCompatibleProvider(config: {
  id: ProviderId;
  label: string;
  baseURL: string;
  models: ModelInfo[];
  computeCost: (model: string, inputTokens: number, outputTokens: number) => number;
}): Provider {
  async function* streamComplete(userId: number, params: RunParams, signal: AbortSignal): AsyncIterable<StreamChunk> {
    const apiKey = await getRawKey(userId, config.id);
    if (!apiKey) {
      yield { type: "error", message: `등록된 ${config.label} API 키가 없습니다.` };
      return;
    }

    const client = new OpenAI({ apiKey, baseURL: config.baseURL });
    yield* streamOpenAiCompatible(client, config.label, params, signal, config.computeCost);
  }

  return {
    id: config.id,
    label: config.label,
    async listModels() {
      return config.models;
    },
    streamComplete,
  };
}
