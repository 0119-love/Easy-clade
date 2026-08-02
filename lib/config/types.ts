export type ProviderId = "anthropic" | "openai" | "google" | "xai" | "perplexity" | "deepseek" | "openrouter";

export const PROVIDER_IDS: ProviderId[] = [
  "anthropic",
  "openai",
  "google",
  "xai",
  "perplexity",
  "deepseek",
  "openrouter",
];

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: "Claude",
  openai: "ChatGPT",
  google: "Gemini",
  xai: "Grok",
  perplexity: "Perplexity",
  deepseek: "DeepSeek",
  openrouter: "OpenRouter",
};

/**
 * Visual identity for <ProviderMark> -- a monogram-in-tinted-circle, not a
 * logo mark. Deliberately not recreating Anthropic's sunburst / OpenAI's knot
 * / Google's sparkle: even simplified or recolored, those are the actual
 * protectable trademark elements. colorVar points at a CSS custom property
 * defined in app/globals.css.
 */
export const PROVIDER_META: Record<ProviderId, { colorVar: string }> = {
  anthropic: { colorVar: "--provider-anthropic" },
  openai: { colorVar: "--provider-openai" },
  google: { colorVar: "--provider-google" },
  xai: { colorVar: "--provider-xai" },
  perplexity: { colorVar: "--provider-perplexity" },
  deepseek: { colorVar: "--provider-deepseek" },
  openrouter: { colorVar: "--provider-openrouter" },
};

/** Deep links straight to each provider's API key creation page. */
export const PROVIDER_KEY_URLS: Record<ProviderId, string> = {
  anthropic: "https://console.anthropic.com/settings/keys",
  openai: "https://platform.openai.com/api-keys",
  google: "https://aistudio.google.com/apikey",
  xai: "https://console.x.ai",
  perplexity: "https://www.perplexity.ai/account/api/keys",
  deepseek: "https://platform.deepseek.com/api_keys",
  openrouter: "https://openrouter.ai/keys",
};

/**
 * "api_key" -- classic console.anthropic.com key, pasted by hand (or by the
 * other two providers, which only ever have this form).
 * "oauth" -- connected via the Chrome extension's subscription login; the
 * SDK is handed a short-lived bearer token instead (see lib/auth/anthropicOAuth.ts).
 */
export type ProviderAuthType = "api_key" | "oauth";

export interface ProviderKeyStatus {
  configured: boolean;
  authType: ProviderAuthType;
  maskedKey: string | null;
  updatedAt: string | null;
  lastSuccessfulCallAt: string | null;
  lastCallStatus: "success" | "error" | null;
  lastCallError: string | null;
}

export interface DailyBudget {
  tokens: number | null;
  costUsd: number | null;
}

export interface Preferences {
  defaultTemperature: number;
  defaultEffort: "low" | "medium" | "high" | "xhigh" | "max";
  showThinkingByDefault: boolean;
  syncScrollDefault: boolean;
  /** Which providers the dashboard grid shows. Chosen once via the first-run picker, editable later in Preferences. */
  activeProviders: ProviderId[];
  /** Whether the first-run provider picker has been completed -- controls whether it pops up again. */
  providersOnboarded: boolean;
}

export interface KeysStatusResponse {
  providers: Record<ProviderId, ProviderKeyStatus>;
  dailyBudget: DailyBudget;
}
