import type OpenAI from "openai";
import type { RunParams, StreamChunk } from "./types";

/**
 * Chat Completions streaming loop shared by every OpenAI-compatible vendor
 * (xAI/Perplexity/DeepSeek via openaiCompatible.ts, OpenRouter via
 * openrouter.ts). Callers build their own `OpenAI` client (their own
 * baseURL/headers/key) and pass it in -- this only owns the request/stream/
 * usage accumulation loop, which is identical across every vendor that
 * speaks this API shape.
 */
export async function* streamOpenAiCompatible(
  client: OpenAI,
  label: string,
  params: RunParams,
  signal: AbortSignal,
  computeCost: (model: string, inputTokens: number, outputTokens: number) => number,
): AsyncIterable<StreamChunk> {
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
        // most OpenAI-compatible vendors document support for it. If a given
        // vendor ignores unknown fields instead, chunk.usage just stays
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
      costUsd: computeCost(params.model, inputTokens, outputTokens),
      stopReason,
    };
  } catch (err) {
    if (signal.aborted) return; // Stop button -- the route handler records this as "stopped", not an error
    const message = err instanceof Error ? err.message : `알 수 없는 ${label} 오류`;
    yield { type: "error", message };
  }
}
