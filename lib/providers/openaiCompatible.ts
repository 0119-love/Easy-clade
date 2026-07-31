import OpenAI from "openai";
import { getRawKey } from "../config/keysStore";
import type { ModelInfo, Provider, RunParams, StreamChunk } from "./types";
import type { ProviderId } from "../config/types";

/**
 * Shared adapter for vendors that expose an OpenAI Chat Completions-shaped
 * API (a different, older, simpler surface than the Responses API
 * lib/providers/openai.ts itself uses for the real OpenAI product) -- xAI's
 * Grok, Perplexity, and DeepSeek all publish "point the OpenAI SDK at our
 * baseURL" compatibility, so one adapter covers all three instead of
 * duplicating the streaming loop per vendor.
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
    const maxTokens = Math.min(params.maxTokens ?? 4096, 128_000);

    try {
      const stream = await client.chat.completions.create(
        {
          model: params.model,
          messages: [
            ...(params.systemPrompt ? [{ role: "system" as const, content: params.systemPrompt }] : []),
            { role: "user" as const, content: params.userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: params.temperature,
          stream: true,
          // Standard OpenAI streaming convention for getting a usage chunk;
          // xAI and DeepSeek document support for it. If a given vendor
          // ignores unknown fields instead, chunk.usage just stays
          // undefined and tokens/cost report as 0 rather than throwing.
          stream_options: { include_usage: true },
        },
        { signal },
      );

      let inputTokens = 0;
      let outputTokens = 0;
      let stopReason = "stop";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield { type: "text-delta", text: delta };
        if (chunk.choices[0]?.finish_reason) stopReason = chunk.choices[0].finish_reason;
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
        }
      }

      yield {
        type: "done",
        inputTokens,
        outputTokens,
        costUsd: config.computeCost(params.model, inputTokens, outputTokens),
        stopReason,
      };
    } catch (err) {
      if (signal.aborted) return; // Stop button -- the route handler records this as "stopped", not an error
      const message = err instanceof Error ? err.message : `알 수 없는 ${config.label} 오류`;
      yield { type: "error", message };
    }
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
