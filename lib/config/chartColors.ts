import type { ProviderId } from "./types";

/**
 * Chart-only per-provider palette -- deliberately separate from the shared
 * --provider-* tokens (badges/icons elsewhere), validated with the dataviz
 * skill's categorical-palette checker for a 6-line simultaneous chart:
 * xai/openai/google were re-stepped because the shared badge colors read
 * too gray (xai had ~zero chroma) or collided under deuteranopia/
 * protanopia simulation (openai vs google, adjacent CVD delta 3.0 against
 * an 8 target -- re-stepped to 12.1). anthropic/perplexity/deepseek are
 * untouched brand colors, left as-is by design. openrouter (#c9524a) was
 * re-validated against this set (adjacent-pairs, dark surface #131316):
 * worst adjacent CVD 12.1, worst normal-vision 18.0, both clear of the
 * existing anthropic/perplexity/deepseek brand-color exemptions. Shared by
 * every chart that shows a per-provider breakdown (TokenTrendChart,
 * CostBreakdownChart) so they never drift apart.
 */
export const CHART_PROVIDER_COLORS: Record<ProviderId, string> = {
  anthropic: "#e08d6d",
  openai: "#8b4fd1",
  google: "#2a9dc9",
  xai: "#a3822f",
  perplexity: "#7fd4c9",
  deepseek: "#7b9cf0",
  openrouter: "#c9524a",
};
