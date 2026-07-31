import type { ModelPricing } from "../types";

// PLACEHOLDER -- same caveat as pricing/xai.ts. DeepSeek is publicly known
// for being unusually cheap and for time-of-day discount pricing, neither
// of which this flat per-token table models. Confirm against
// https://api-docs.deepseek.com/quick_start/pricing before trusting this
// anywhere real.
const PRICING_TABLE: Record<string, ModelPricing> = {
  "deepseek-chat": { inputPerMTok: 0.28, outputPerMTok: 0.42 },
  "deepseek-reasoner": { inputPerMTok: 0.55, outputPerMTok: 2.19 },
};

const FALLBACK_PRICING: ModelPricing = { inputPerMTok: 0.28, outputPerMTok: 0.42 };

export function computeDeepseekCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING_TABLE[model] ?? FALLBACK_PRICING;
  return (inputTokens / 1_000_000) * pricing.inputPerMTok + (outputTokens / 1_000_000) * pricing.outputPerMTok;
}
