import type { ModelPricing } from "../types";

// Rates as of 2026-07-28 (Anthropic first-party API pricing, per million tokens).
// claude-sonnet-5 is at its introductory rate through 2026-08-31; standard rate
// ($3.00 / $15.00) applies after -- update this table when that window closes.
const PRICING_TABLE: Record<string, ModelPricing> = {
  "claude-opus-5": { inputPerMTok: 5.0, outputPerMTok: 25.0 },
  "claude-sonnet-5": { inputPerMTok: 2.0, outputPerMTok: 10.0 },
  "claude-haiku-4-5": { inputPerMTok: 1.0, outputPerMTok: 5.0 },
};

const FALLBACK_PRICING: ModelPricing = { inputPerMTok: 3.0, outputPerMTok: 15.0 };

export function computeAnthropicCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING_TABLE[model] ?? FALLBACK_PRICING;
  return (inputTokens / 1_000_000) * pricing.inputPerMTok + (outputTokens / 1_000_000) * pricing.outputPerMTok;
}
