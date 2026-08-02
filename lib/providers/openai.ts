import OpenAI from "openai";
import { getRawKey } from "../config/keysStore";
import { computeOpenAiCost } from "./pricing/openai";
import { formatProviderError } from "./errorMessage";
import type { ModelInfo, Provider, RunParams, StreamChunk } from "./types";

// gpt-5.4-mini / gpt-5.4-nano share the base model's context window and max
// output per OpenAI's generation-family pattern; only pricing differs.
const MODELS: ModelInfo[] = [
  { id: "gpt-5.4", label: "GPT-5.4", contextWindow: 1_050_000, maxOutputTokens: 128_000 },
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", contextWindow: 1_050_000, maxOutputTokens: 128_000 },
  { id: "gpt-5.4-nano", label: "GPT-5.4 Nano", contextWindow: 1_050_000, maxOutputTokens: 128_000 },
];

async function* streamComplete(userId: number, params: RunParams, signal: AbortSignal): AsyncIterable<StreamChunk> {
  const apiKey = await getRawKey(userId, "openai");
  if (!apiKey) {
    yield { type: "error", message: "등록된 OpenAI API 키가 없습니다." };
    return;
  }

  const client = new OpenAI({ apiKey });
  const maxOutputTokens = Math.min(params.maxTokens ?? 4096, 128_000);

  try {
    const stream = await client.responses.create(
      {
        model: params.model,
        input: params.attachments?.length
          ? [
              {
                role: "user" as const,
                content: [
                  { type: "input_text" as const, text: params.userPrompt },
                  ...params.attachments.map((a) => ({
                    type: "input_image" as const,
                    image_url: `data:${a.mimeType};base64,${a.data}`,
                    detail: "auto" as const,
                  })),
                ],
              },
            ]
          : params.userPrompt,
        instructions: params.systemPrompt,
        max_output_tokens: maxOutputTokens,
        temperature: params.temperature,
        ...(params.effort ? { reasoning: { effort: params.effort } } : {}),
        stream: true,
      },
      { signal },
    );

    let refusalText = "";

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        yield { type: "text-delta", text: event.delta };
      } else if (event.type === "response.refusal.delta") {
        refusalText += event.delta;
      } else if (event.type === "response.failed") {
        yield { type: "error", message: event.response.error?.message ?? "OpenAI 요청이 실패했습니다." };
        return;
      } else if (event.type === "response.completed") {
        if (refusalText) {
          yield { type: "error", message: refusalText };
          return;
        }
        const usage = event.response.usage;
        yield {
          type: "done",
          inputTokens: usage?.input_tokens ?? 0,
          outputTokens: usage?.output_tokens ?? 0,
          costUsd: computeOpenAiCost(params.model, usage?.input_tokens ?? 0, usage?.output_tokens ?? 0),
          stopReason: event.response.status ?? "completed",
        };
        return;
      }
    }
  } catch (err) {
    if (signal.aborted) return; // Stop button -- the route handler records this as "stopped", not an error
    yield { type: "error", message: formatProviderError(err, "알 수 없는 OpenAI 오류") };
  }
}

export const openaiProvider: Provider = {
  id: "openai",
  label: "ChatGPT",
  async listModels() {
    return MODELS;
  },
  async estimateCost(modelId, inputTokens, outputTokens) {
    return computeOpenAiCost(modelId, inputTokens, outputTokens);
  },
  streamComplete,
};
