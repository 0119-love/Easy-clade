import type { ModelPricing } from "../types";

// PLACEHOLDER -- same caveat as pricing/xai.ts: not verified current
// pricing, just a plausible-range guess. Perplexity's real pricing also has
// a per-request fee on top of per-token cost for some Sonar models, which
// this simple per-token model doesn't represent at all. Confirm against
// https://docs.perplexity.ai/getting-started/pricing before trusting this
// anywhere real.
const PRICING_TABLE: Record<string, ModelPricing> = {
  "sonar-pro": { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  sonar: { inputPerMTok: 1.0, outputPerMTok: 1.0 },
};

const FALLBACK_PRICING: ModelPricing = { inputPerMTok: 1.0, outputPerMTok: 1.0 };

export function computePerplexityCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING_TABLE[model] ?? FALLBACK_PRICING;
  return (inputTokens / 1_000_000) * pricing.inputPerMTok + (outputTokens / 1_000_000) * pricing.outputPerMTok;
}
