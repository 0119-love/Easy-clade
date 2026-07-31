import type { ModelPricing } from "../types";

// Rates as of 2026-07-28 (OpenAI standard tier, <=272K context; per million tokens).
const PRICING_TABLE: Record<string, ModelPricing> = {
  "gpt-5.4": { inputPerMTok: 2.5, outputPerMTok: 15.0 },
  "gpt-5.4-mini": { inputPerMTok: 0.75, outputPerMTok: 4.5 },
  "gpt-5.4-nano": { inputPerMTok: 0.2, outputPerMTok: 1.25 },
};

const FALLBACK_PRICING: ModelPricing = { inputPerMTok: 2.5, outputPerMTok: 15.0 };

export function computeOpenAiCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING_TABLE[model] ?? FALLBACK_PRICING;
  return (inputTokens / 1_000_000) * pricing.inputPerMTok + (outputTokens / 1_000_000) * pricing.outputPerMTok;
}
