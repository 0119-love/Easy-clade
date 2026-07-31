import type { ModelInfo, Provider, RunParams, StreamChunk } from "./types";

const MODELS: ModelInfo[] = [
  { id: "mock-large", label: "Mock Large", contextWindow: 200_000, maxOutputTokens: 8_192 },
];

const CANNED_RESPONSE =
  "This is a deterministic mock response used for local development without any provider API keys. " +
  "It streams in small chunks with an artificial delay so the full Run -> streaming -> Stop -> history pipeline " +
  "can be exercised end-to-end with zero real spend, including a fenced code block below.\n\n" +
  "```ts\nfunction greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n```\n\n" +
  "That block above should render with real syntax highlighting.";

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function makeMockProvider(id: Provider["id"], label: string): Provider {
  async function* streamComplete(_userId: number, params: RunParams, signal: AbortSignal): AsyncIterable<StreamChunk> {
    const words = CANNED_RESPONSE.split(" ");
    try {
      for (const word of words) {
        await sleep(40, signal);
        yield { type: "text-delta", text: `${word} ` };
      }
      const inputTokens = Math.ceil(params.userPrompt.length / 4);
      const outputTokens = Math.ceil(CANNED_RESPONSE.length / 4);
      yield {
        type: "done",
        inputTokens,
        outputTokens,
        costUsd: 0,
        stopReason: "end_turn",
      };
    } catch {
      if (!signal.aborted) throw new Error("Mock provider failed unexpectedly");
      // Stop button -- the route handler records this as "stopped", not an error
    }
  }

  return {
    id,
    label,
    async listModels() {
      return MODELS;
    },
    streamComplete,
  };
}

export const mockAnthropicProvider = makeMockProvider("anthropic", "Claude (mock)");
export const mockOpenaiProvider = makeMockProvider("openai", "ChatGPT (mock)");
export const mockGoogleProvider = makeMockProvider("google", "Gemini (mock)");
export const mockXaiProvider = makeMockProvider("xai", "Grok (mock)");
export const mockPerplexityProvider = makeMockProvider("perplexity", "Perplexity (mock)");
export const mockDeepseekProvider = makeMockProvider("deepseek", "DeepSeek (mock)");
