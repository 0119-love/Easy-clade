import type { KeysStatusResponse, ProviderId } from "../config/types";

export interface RouteDecision {
  provider: ProviderId;
  reason: string;
}

const CODE_SHAPED_PATTERN = /```|function\s+\w+\(|class\s+\w+|def\s+\w+\(|SELECT\s+.+FROM|<\/?[a-z]+>/i;
const FRESHNESS_PATTERN =
  /\b(today|latest|current|this week|right now|recent|breaking)\b|오늘|최신|최근|지금|이번\s?주|실시간|속보/i;
const SHORT_PROMPT_LENGTH = 120;

// Cheapest-per-input-token order, used as the fallback route. DeepSeek is
// genuinely the cheapest of the six on paper (see pricing/deepseek.ts's
// caveat about that table being unverified), so it leads.
const CHEAPEST_ORDER: ProviderId[] = ["deepseek", "google", "openai", "xai", "anthropic", "perplexity"];
// Provider generally strongest for code-shaped prompts, all else equal.
const CODE_PREFERRED_ORDER: ProviderId[] = ["anthropic", "openai", "deepseek", "xai", "google", "perplexity"];

/**
 * Deliberately not a learned router -- a small, explainable rule function.
 * Always returns a `reason` string so the mechanism stays transparent in the UI.
 */
export function autoRoute(
  userPrompt: string,
  keysStatus: KeysStatusResponse,
  defaultProvider: ProviderId,
): RouteDecision {
  const configured = (id: ProviderId) => keysStatus.providers[id]?.configured ?? false;

  if (CODE_SHAPED_PATTERN.test(userPrompt)) {
    const provider = CODE_PREFERRED_ORDER.find(configured);
    if (provider) return { provider, reason: "프롬프트가 코드 형태로 보여 코딩에 강한 모델로 라우팅했습니다." };
  }

  if (userPrompt.trim().length < SHORT_PROMPT_LENGTH) {
    const provider = CHEAPEST_ORDER.find(configured);
    if (provider) return { provider, reason: "짧은 프롬프트라 가장 저렴한 등록된 모델로 라우팅했습니다." };
  }

  if (FRESHNESS_PATTERN.test(userPrompt)) {
    // Perplexity is search-grounded by design, a better fit for "what's
    // happening right now" than a plain chat model -- Gemini was the
    // reasonable pick before this provider existed, so it stays as the
    // second choice rather than dropping out.
    if (configured("perplexity")) return { provider: "perplexity", reason: "최신 정보를 언급하고 있어 검색 기반 모델로 라우팅했습니다." };
    if (configured("google")) return { provider: "google", reason: "최신 정보를 언급하고 있어 Gemini로 라우팅했습니다." };
    const provider = CHEAPEST_ORDER.find(configured);
    if (provider) return { provider, reason: "최신 정보를 언급하고 있지만 등록된 검색 기반 모델이 없어 대신 라우팅했습니다." };
  }

  if (configured(defaultProvider)) {
    return { provider: defaultProvider, reason: "특별한 신호가 없어 기본 모델로 라우팅했습니다." };
  }

  const fallback = CHEAPEST_ORDER.find(configured) ?? defaultProvider;
  return { provider: fallback, reason: "등록된 기본 모델이 없어 가장 저렴한 등록된 모델로 라우팅했습니다." };
}
