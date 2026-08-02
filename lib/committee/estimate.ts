import type { ProviderId } from "../config/types";
import type { CommitteeContext, CommitteeStage } from "./types";
import { DEFAULT_MODEL_BY_PROVIDER } from "./defaults";
import { computeAnthropicCost } from "../providers/pricing/anthropic";
import { computeOpenAiCost } from "../providers/pricing/openai";
import { computeGoogleCost } from "../providers/pricing/google";
import { computeXaiCost } from "../providers/pricing/xai";
import { computePerplexityCost } from "../providers/pricing/perplexity";
import { computeDeepseekCost } from "../providers/pricing/deepseek";

const CHARS_PER_TOKEN = 4; // same heuristic lib/providers/mock.ts already uses

const ASSUMED_OUTPUT_TOKENS: Record<CommitteeStage, number> = {
  prompt_optimize: 300,
  initial_draft: 700,
  cross_review: 400,
  self_reflect: 700,
  judge: 600,
};

// Hardcoded guesses, NOT derived from real telemetry -- runs.latency_ms is
// never actually populated server-side today (app/api/run/route.ts always
// inserts null), so there's no historical per-provider latency to build a
// real model from. Callers must show these as an honest upper-bound
// estimate ("최대 예상"), never as a precise number.
const ASSUMED_LATENCY_SECONDS: Record<ProviderId, number> = {
  anthropic: 12,
  openai: 10,
  google: 8,
  xai: 10,
  perplexity: 14,
  deepseek: 9,
  openrouter: 11,
};

// OpenRouter's real per-model pricing lives in a live catalog fetch
// (lib/providers/openrouter.ts), which this module deliberately can't call --
// estimateCommitteeRun() is documented as pure/no-network so the composer can
// recompute it on every keystroke. A flat mid-range placeholder (same shape
// as the "PLACEHOLDER" xAI/Perplexity/DeepSeek tables in
// lib/providers/pricing/) keeps that promise; the real run still bills the
// real per-model catalog price, only this pre-run estimate is approximate.
function estimateOpenRouterCost(_model: string, inputTokens: number, outputTokens: number): number {
  const PLACEHOLDER_PRICING = { inputPerMTok: 3.0, outputPerMTok: 15.0 };
  return (inputTokens / 1_000_000) * PLACEHOLDER_PRICING.inputPerMTok + (outputTokens / 1_000_000) * PLACEHOLDER_PRICING.outputPerMTok;
}

const COST_FN: Record<ProviderId, (model: string, inputTokens: number, outputTokens: number) => number> = {
  anthropic: computeAnthropicCost,
  openai: computeOpenAiCost,
  google: computeGoogleCost,
  xai: computeXaiCost,
  perplexity: computePerplexityCost,
  deepseek: computeDeepseekCost,
  openrouter: estimateOpenRouterCost,
};

export interface CommitteeEstimateInput {
  mission: string;
  context: CommitteeContext;
  providers: ProviderId[];
  maxLoops: number;
  judgeProvider: ProviderId;
}

export interface CommitteeEstimateResult {
  estimatedMaxCostUsd: number;
  estimatedMaxSeconds: number;
  totalCalls: number;
}

function estimateInputTokens(mission: string, context: CommitteeContext): number {
  const contextChars =
    context.targetUsers.length + context.style.length + context.techStack.length + context.specialRequirements.length;
  return Math.ceil((mission.length + contextChars) / CHARS_PER_TOKEN);
}

/**
 * Pure, no network round trip -- pricing tables are plain data (not secret),
 * so the composer can recompute this live via useMemo as the user types or
 * toggles providers. Always a worst-case ("if every loop runs to maxLoops")
 * figure, since the actual stopping point depends on a quality score we
 * can't know before running.
 */
export function estimateCommitteeRun(input: CommitteeEstimateInput): CommitteeEstimateResult {
  const { providers, maxLoops, judgeProvider } = input;
  const n = providers.length;
  const missionTokens = estimateInputTokens(input.mission, input.context);

  let costUsd = 0;
  let totalCalls = 0;

  function addCall(providerId: ProviderId, stage: CommitteeStage, inputTokens: number) {
    const model = DEFAULT_MODEL_BY_PROVIDER[providerId];
    const outputTokens = ASSUMED_OUTPUT_TOKENS[stage];
    costUsd += COST_FN[providerId](model, inputTokens, outputTokens);
    totalCalls += 1;
  }

  addCall(judgeProvider, "prompt_optimize", missionTokens);
  for (const p of providers) addCall(p, "initial_draft", missionTokens);

  const otherDraftsTokens = Math.max(0, n - 1) * ASSUMED_OUTPUT_TOKENS.initial_draft;
  for (let loop = 0; loop < maxLoops; loop++) {
    for (const p of providers) addCall(p, "cross_review", missionTokens + ASSUMED_OUTPUT_TOKENS.self_reflect + otherDraftsTokens);
    for (const p of providers) {
      addCall(p, "self_reflect", missionTokens + ASSUMED_OUTPUT_TOKENS.self_reflect + Math.max(0, n - 1) * ASSUMED_OUTPUT_TOKENS.cross_review);
    }
    addCall(judgeProvider, "judge", missionTokens + n * ASSUMED_OUTPUT_TOKENS.self_reflect);
  }

  // Stages run concurrently per loop (Promise.all across providers), so wall
  // time tracks the slowest single call in that stage, not the sum of all of them.
  const maxProviderLatency = providers.length > 0 ? Math.max(...providers.map((p) => ASSUMED_LATENCY_SECONDS[p])) : 0;
  const judgeLatency = ASSUMED_LATENCY_SECONDS[judgeProvider];
  const perLoopSeconds = maxProviderLatency * 2 + judgeLatency; // cross_review + self_reflect + judge
  const estimatedMaxSeconds = judgeLatency + maxProviderLatency + maxLoops * perLoopSeconds;

  return { estimatedMaxCostUsd: costUsd, estimatedMaxSeconds, totalCalls };
}
