import type { ModelPricing } from "../types";

// PLACEHOLDER -- unlike the anthropic/openai/google pricing tables, I don't
// have verified current pricing for xAI's API. This repo's scenario date
// (2026-07-30) is past what I can confirm, and these numbers are a rough
// guess in the right ballpark, not a checked fact. Confirm against
// https://x.ai/api before trusting Cost Killer/analytics numbers for this
// provider -- and update this file (and its DeepSeek/Perplexity siblings)
// once you have real figures.
const PRICING_TABLE: Record<string, ModelPricing> = {
  "grok-5": { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  "grok-5-mini": { inputPerMTok: 0.3, outputPerMTok: 1.5 },
};

const FALLBACK_PRICING: ModelPricing = { inputPerMTok: 3.0, outputPerMTok: 15.0 };

export function computeXaiCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING_TABLE[model] ?? FALLBACK_PRICING;
  return (inputTokens / 1_000_000) * pricing.inputPerMTok + (outputTokens / 1_000_000) * pricing.outputPerMTok;
}
