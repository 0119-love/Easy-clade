import type { ProviderId } from "../config/types";

// Same default per-provider model ids as dashboardStore's defaultCard() --
// kept as its own const (not imported from dashboardStore) since the
// committee feature deliberately doesn't depend on the run console's state.
export const DEFAULT_MODEL_BY_PROVIDER: Record<ProviderId, string> = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-5.4",
  google: "gemini-3.5-flash",
  xai: "grok-5",
  perplexity: "sonar-pro",
  deepseek: "deepseek-chat",
};

export const DEFAULT_TARGET_QUALITY_SCORE = 94;
export const DEFAULT_MAX_LOOPS = 5;
export const MIN_MAX_LOOPS = 1;
export const MAX_MAX_LOOPS = 8;
