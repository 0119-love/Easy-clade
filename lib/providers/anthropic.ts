import Anthropic from "@anthropic-ai/sdk";
import { getOAuthTokens, getRawKey, updateOAuthAccessToken } from "../config/keysStore";
import { getValidAccessToken } from "../auth/anthropicOAuth";
import { computeAnthropicCost } from "./pricing/anthropic";
import type { ModelInfo, Provider, RunParams, StreamChunk } from "./types";

const MODELS: ModelInfo[] = [
  { id: "claude-opus-5", label: "Claude Opus 5", contextWindow: 1_000_000, maxOutputTokens: 128_000 },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5", contextWindow: 1_000_000, maxOutputTokens: 128_000 },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", contextWindow: 200_000, maxOutputTokens: 64_000 },
];

// Adaptive thinking is only valid on the current-generation models; Haiku 4.5
// is in the older tier and doesn't support it (would need budget_tokens instead).
const ADAPTIVE_THINKING_MODELS = new Set(["claude-opus-5", "claude-sonnet-5"]);

/**
 * Picks whichever credential this machine has for Claude: a pasted console
 * API key (`new Anthropic({ apiKey })`), or -- if connected through the
 * Chrome extension's "Connect" button -- a subscription OAuth bearer token
 * (`new Anthropic({ authToken })`, a first-class option the SDK documents
 * alongside apiKey). The oauth branch refreshes the token first if it's
 * expiring, and persists the refreshed pair so the next call doesn't have to.
 */
async function getAnthropicClient(userId: number): Promise<Anthropic | null> {
  const oauth = await getOAuthTokens(userId, "anthropic");
  if (oauth) {
    const authToken = await getValidAccessToken(oauth, (refreshed) =>
      updateOAuthAccessToken(userId, "anthropic", refreshed.accessToken, refreshed.expiresAt),
    );
    return new Anthropic({ authToken });
  }

  const apiKey = await getRawKey(userId, "anthropic");
  if (apiKey) return new Anthropic({ apiKey });

  return null;
}

async function* streamComplete(userId: number, params: RunParams, signal: AbortSignal): AsyncIterable<StreamChunk> {
  let client: Anthropic | null;
  try {
    client = await getAnthropicClient(userId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "인증 정보를 확인하는 중 오류가 발생했습니다.";
    yield { type: "error", message: `Claude 재인증이 필요합니다: ${message}` };
    return;
  }
  if (!client) {
    yield { type: "error", message: "등록된 Anthropic API 키가 없습니다. 설정에서 키를 등록하거나 확장 프로그램으로 연결하세요." };
    return;
  }
  const maxTokens = Math.min(params.maxTokens ?? 4096, 128_000);

  try {
    const stream = client.messages.stream(
      {
        model: params.model,
        max_tokens: maxTokens,
        system: params.systemPrompt,
        messages: [
          {
            role: "user",
            content: params.attachments?.length
              ? [
                  ...params.attachments.map((a) => ({
                    type: "image" as const,
                    source: { type: "base64" as const, media_type: a.mimeType, data: a.data },
                  })),
                  { type: "text" as const, text: params.userPrompt },
                ]
              : params.userPrompt,
          },
        ],
        ...(ADAPTIVE_THINKING_MODELS.has(params.model)
          ? {
              thinking: { type: "adaptive" as const, display: "summarized" as const },
              ...(params.effort ? { output_config: { effort: params.effort } } : {}),
            }
          : {}),
      },
      { signal },
    );

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          yield { type: "text-delta", text: event.delta.text };
        } else if (event.delta.type === "thinking_delta") {
          yield { type: "thinking-delta", text: event.delta.thinking };
        }
      }
    }

    const finalMessage = await stream.finalMessage();

    if (finalMessage.stop_reason === "refusal") {
      const details = finalMessage.stop_details;
      const category = details?.category ? ` (${details.category})` : "";
      yield { type: "error", message: `Claude가 응답을 거부했습니다${category}.` };
      return;
    }

    yield {
      type: "done",
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
      costUsd: computeAnthropicCost(params.model, finalMessage.usage.input_tokens, finalMessage.usage.output_tokens),
      stopReason: finalMessage.stop_reason ?? "end_turn",
    };
  } catch (err) {
    if (signal.aborted) return; // Stop button -- the route handler records this as "stopped", not an error
    const message = err instanceof Error ? err.message : "알 수 없는 Anthropic 오류";
    yield { type: "error", message };
  }
}

export const anthropicProvider: Provider = {
  id: "anthropic",
  label: "Claude",
  async listModels() {
    return MODELS;
  },
  async estimateCost(modelId, inputTokens, outputTokens) {
    return computeAnthropicCost(modelId, inputTokens, outputTokens);
  },
  streamComplete,
};
