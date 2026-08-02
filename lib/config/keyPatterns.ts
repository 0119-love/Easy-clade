import type { ProviderId } from "./types";

/** Used to pull just the key out of a loose paste (e.g. the whole console page copied by mistake). */
// xAI and DeepSeek both issue plain `sk-...` keys with no distinguishing
// prefix (same shape as OpenAI's), so there's no reliable regex to tell them
// apart from a pasted blob -- extractApiKey falls back to the trimmed input
// for those two, same as it would for an unrecognized provider.
const PROVIDER_KEY_PATTERNS: Partial<Record<ProviderId, RegExp>> = {
  anthropic: /sk-ant-[a-zA-Z0-9_-]{20,}/,
  openai: /sk-(?!ant-)[a-zA-Z0-9_-]{20,}/,
  google: /AIza[0-9A-Za-z_-]{35}/,
  perplexity: /pplx-[a-zA-Z0-9]{20,}/,
  openrouter: /sk-or-v1-[a-zA-Z0-9]{20,}/,
};

/** Extracts a provider-shaped API key from arbitrary pasted text; falls back to the trimmed input if no match. */
export function extractApiKey(provider: ProviderId, text: string): string {
  const pattern = PROVIDER_KEY_PATTERNS[provider];
  const match = pattern?.exec(text);
  return match ? match[0] : text.trim();
}
