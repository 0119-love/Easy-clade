import { createOpenAiCompatibleProvider } from "./openaiCompatible";
import { computePerplexityCost } from "./pricing/perplexity";
import type { ModelInfo } from "./types";

const MODELS: ModelInfo[] = [
  { id: "sonar-pro", label: "Sonar Pro", contextWindow: 128_000, maxOutputTokens: 8_192 },
  { id: "sonar", label: "Sonar", contextWindow: 128_000, maxOutputTokens: 8_192 },
];

export const perplexityProvider = createOpenAiCompatibleProvider({
  id: "perplexity",
  label: "Perplexity",
  baseURL: "https://api.perplexity.ai",
  models: MODELS,
  computeCost: computePerplexityCost,
});
