import OpenAI from "openai";
import { getRawKey } from "../config/keysStore";
import { streamOpenAiCompatible } from "./openAiCompatibleStream";
import type { ModelInfo, ModelPricing, Provider, RunParams, StreamChunk } from "./types";

const BASE_URL = "https://openrouter.ai/api/v1";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Cosmetic attribution headers OpenRouter documents (shows up on their own
// leaderboard/rankings) -- not required for requests to work.
const ATTRIBUTION_HEADERS = {
  "HTTP-Referer": "https://easy-clade.vercel.app",
  "X-Title": "AI Command Center",
};

interface OpenRouterModelsCache {
  models: ModelInfo[];
  pricing: Map<string, ModelPricing>;
  fetchedAt: number;
}

// Module-scope cache, same "survive across warm serverless invocations"
// pattern lib/history/db.ts uses for its Neon client -- avoids re-fetching
// OpenRouter's full catalog on every single run.
let cache: OpenRouterModelsCache | null = null;
let refreshInFlight: Promise<OpenRouterModelsCache> | null = null;

interface OpenRouterApiModel {
  id: string;
  name?: string;
  context_length?: number;
  // Per-token USD prices as decimal strings, e.g. "0.000003" -- NOT per
  // million tokens, unlike this app's own ModelPricing convention, so these
  // get converted below.
  pricing?: { prompt?: string; completion?: string };
  top_provider?: { max_completion_tokens?: number | null };
}

async function fetchCatalog(): Promise<OpenRouterModelsCache> {
  // No auth needed to list models -- this is OpenRouter's public catalog.
  const res = await fetch(`${BASE_URL}/models`);
  if (!res.ok) throw new Error(`OpenRouter 모델 목록을 가져오지 못했습니다 (${res.status}).`);
  const body = (await res.json()) as { data: OpenRouterApiModel[] };

  const models: ModelInfo[] = [];
  const pricing = new Map<string, ModelPricing>();

  for (const m of body.data) {
    models.push({
      id: m.id,
      label: m.name ?? m.id,
      contextWindow: m.context_length ?? 128_000,
      maxOutputTokens: m.top_provider?.max_completion_tokens ?? 4_096,
    });
    const promptPerToken = Number(m.pricing?.prompt ?? 0);
    const completionPerToken = Number(m.pricing?.completion ?? 0);
    pricing.set(m.id, {
      inputPerMTok: promptPerToken * 1_000_000,
      outputPerMTok: completionPerToken * 1_000_000,
    });
  }

  return { models, pricing, fetchedAt: Date.now() };
}

/** Serves the cached catalog, refreshing in the background once it's stale; falls back to a stale cache (rather than failing) if a refresh errors. */
async function getCatalog(): Promise<OpenRouterModelsCache> {
  const isStale = !cache || Date.now() - cache.fetchedAt > CACHE_TTL_MS;
  if (!isStale) return cache!;

  if (!refreshInFlight) {
    refreshInFlight = fetchCatalog()
      .then((fresh) => {
        cache = fresh;
        return fresh;
      })
      .catch((err) => {
        if (cache) return cache; // serve stale data rather than erroring the whole request
        throw err;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function computeOpenRouterCost(pricing: Map<string, ModelPricing>, model: string, inputTokens: number, outputTokens: number): number {
  const p = pricing.get(model);
  if (!p) return 0; // Unknown/delisted model between catalog refreshes -- 0 is more honest than a guessed table for a 100+ model catalog.
  return (inputTokens / 1_000_000) * p.inputPerMTok + (outputTokens / 1_000_000) * p.outputPerMTok;
}

async function* streamComplete(userId: number, params: RunParams, signal: AbortSignal): AsyncIterable<StreamChunk> {
  const apiKey = await getRawKey(userId, "openrouter");
  if (!apiKey) {
    yield { type: "error", message: "등록된 OpenRouter API 키가 없습니다." };
    return;
  }

  const catalog = await getCatalog().catch(() => null);
  const client = new OpenAI({ apiKey, baseURL: BASE_URL, defaultHeaders: ATTRIBUTION_HEADERS });
  yield* streamOpenAiCompatible(client, "OpenRouter", params, signal, (model, inputTokens, outputTokens) =>
    catalog ? computeOpenRouterCost(catalog.pricing, model, inputTokens, outputTokens) : 0,
  );
}

export const openrouterProvider: Provider = {
  id: "openrouter",
  label: "OpenRouter",
  async listModels() {
    const catalog = await getCatalog().catch(() => null);
    return catalog?.models ?? [];
  },
  async estimateCost(modelId, inputTokens, outputTokens) {
    const catalog = await getCatalog().catch(() => null);
    return catalog ? computeOpenRouterCost(catalog.pricing, modelId, inputTokens, outputTokens) : 0;
  },
  streamComplete,
};
