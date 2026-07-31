import type { ModelPricing } from "../types";

// Rates as of 2026-07-28 (Gemini API standard tier, <=200K context; per million tokens).
const PRICING_TABLE: Record<string, ModelPricing> = {
  "gemini-3.1-pro-preview": { inputPerMTok: 2.0, outputPerMTok: 12.0 },
  "gemini-3.5-flash": { inputPerMTok: 1.5, outputPerMTok: 9.0 },
  "gemini-3.1-flash-lite": { inputPerMTok: 0.25, outputPerMTok: 1.5 },
};

const FALLBACK_PRICING: ModelPricing = { inputPerMTok: 1.5, outputPerMTok: 9.0 };

export function computeGoogleCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING_TABLE[model] ?? FALLBACK_PRICING;
  return (inputTokens / 1_000_000) * pricing.inputPerMTok + (outputTokens / 1_000_000) * pricing.outputPerMTok;
}
