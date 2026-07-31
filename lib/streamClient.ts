import type { ProviderId } from "./config/types";
import type { StreamChunk } from "./providers/types";
import { useDashboardStore } from "./store/dashboardStore";
import { abortRun, clearRunController, createRunController } from "./store/abortControllers";
import { queryClient } from "./queryClient";

export interface RunRequestBody {
  provider: ProviderId;
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  runGroupId: string;
  projectId?: number | null;
  attachmentFileIds?: number[];
}

async function* readNdjson(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamChunk> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line) yield JSON.parse(line) as StreamChunk;
      }
    }
    const trailing = buffer.trim();
    if (trailing) yield JSON.parse(trailing) as StreamChunk;
  } finally {
    reader.releaseLock();
  }
}

export async function runProvider(request: RunRequestBody): Promise<void> {
  const store = useDashboardStore.getState();
  const controller = createRunController(request.provider);
  store.startRun(request.provider);

  const startedAt = performance.now();
  let firstTokenMs: number | null = null;

  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "요청에 실패했습니다.");
      store.failRun(request.provider, text || `요청이 실패했습니다 (상태 코드 ${res.status}).`);
      return;
    }

    for await (const chunk of readNdjson(res.body)) {
      switch (chunk.type) {
        case "text-delta":
          firstTokenMs ??= performance.now() - startedAt;
          store.appendText(request.provider, chunk.text);
          break;
        case "thinking-delta":
          firstTokenMs ??= performance.now() - startedAt;
          store.appendThinking(request.provider, chunk.text);
          break;
        case "done":
          store.finishRun(request.provider, {
            inputTokens: chunk.inputTokens,
            outputTokens: chunk.outputTokens,
            costUsd: chunk.costUsd,
            latencyMs: Math.round(firstTokenMs ?? performance.now() - startedAt),
          });
          break;
        case "error":
          store.failRun(request.provider, chunk.message);
          break;
        case "persisted":
          store.setCardRunId(request.provider, chunk.runId);
          break;
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      store.stopRun(request.provider);
    } else {
      const message = err instanceof Error ? err.message : "알 수 없는 스트리밍 오류";
      store.failRun(request.provider, message);
    }
  } finally {
    clearRunController(request.provider);
    void queryClient.invalidateQueries({ queryKey: ["history"] });
    void queryClient.invalidateQueries({ queryKey: ["settings", "keys"] });
  }
}

export function stopProvider(provider: ProviderId): void {
  abortRun(provider);
}
