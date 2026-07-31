import { createOpenAiCompatibleProvider } from "./openaiCompatible";
import { computeXaiCost } from "./pricing/xai";
import type { ModelInfo } from "./types";

const MODELS: ModelInfo[] = [
  { id: "grok-5", label: "Grok 5", contextWindow: 256_000, maxOutputTokens: 32_000 },
  { id: "grok-5-mini", label: "Grok 5 Mini", contextWindow: 256_000, maxOutputTokens: 32_000 },
];

export const xaiProvider = createOpenAiCompatibleProvider({
  id: "xai",
  label: "Grok",
  baseURL: "https://api.x.ai/v1",
  models: MODELS,
  computeCost: computeXaiCost,
});
