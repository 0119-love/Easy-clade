import { PROVIDER_IDS, type ProviderId } from "../config/types";
import { anthropicProvider } from "./anthropic";
import { openaiProvider } from "./openai";
import { googleProvider } from "./google";
import { xaiProvider } from "./xai";
import { perplexityProvider } from "./perplexity";
import { deepseekProvider } from "./deepseek";
import {
  mockAnthropicProvider,
  mockDeepseekProvider,
  mockGoogleProvider,
  mockOpenaiProvider,
  mockPerplexityProvider,
  mockXaiProvider,
} from "./mock";
import type { Provider } from "./types";

const REAL_PROVIDERS: Record<ProviderId, Provider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  google: googleProvider,
  xai: xaiProvider,
  perplexity: perplexityProvider,
  deepseek: deepseekProvider,
};

const MOCK_PROVIDERS: Record<ProviderId, Provider> = {
  anthropic: mockAnthropicProvider,
  openai: mockOpenaiProvider,
  google: mockGoogleProvider,
  xai: mockXaiProvider,
  perplexity: mockPerplexityProvider,
  deepseek: mockDeepseekProvider,
};

// MOCK_PROVIDERS=true swaps every provider for a deterministic canned-text
// stand-in, for local dev/testing without real keys or spend. It's an
// explicit opt-in env flag, not an automatic per-missing-key substitution --
// a real provider with no configured key already yields an honest "No API
// key configured" error chunk, which is what the UI should show a user.
function mocksEnabled(): boolean {
  return process.env.MOCK_PROVIDERS === "true";
}

export function getProvider(id: ProviderId): Provider {
  return mocksEnabled() ? MOCK_PROVIDERS[id] : REAL_PROVIDERS[id];
}

export function getAllProviders(): Provider[] {
  return PROVIDER_IDS.map(getProvider);
}
