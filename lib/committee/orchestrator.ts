import { getProvider } from "../providers/registry";
import { formatProviderError } from "../providers/errorMessage";
import { runJudgeWithFailover, type JudgeCandidate } from "../providers/judgeWithFailover";
import type { ProviderId } from "../config/types";
import type { CommitteeStepRequest, CommitteeStepResult, CommitteeStepStatus } from "./types";
import { DEFAULT_MODEL_BY_PROVIDER } from "./defaults";
import {
  buildCrossReviewUserPrompt,
  buildInitialDraftUserPrompt,
  buildJudgeUserPrompt,
  buildPromptOptimizeUserPrompt,
  buildSelfReflectUserPrompt,
  CROSS_REVIEW_SYSTEM_PROMPT,
  JUDGE_SYSTEM_PROMPT,
  parseQualityScore,
  PROMPT_OPTIMIZE_SYSTEM_PROMPT,
  SELF_REFLECT_SYSTEM_PROMPT,
} from "./prompts";
import {
  getCommitteeRun,
  getCrossReviewTexts,
  getLatestAnswer,
  getLatestAnswersExcept,
  getNextAttemptNumber,
  insertCommitteeLoop,
  insertCommitteeStageCall,
  updateOptimizedMission,
  type LabeledAnswer,
} from "./queries";

// Kept comfortably under Vercel Hobby's ~60s hard ceiling so a hung
// provider call fails cleanly (a real "error" stage-call row) instead of
// the whole function being killed uncleanly by the platform.
const STEP_TIMEOUT_MS = 50_000;

/** Configured judge first, then every other committee participant as a fallback if it's unavailable -- see judgeWithFailover.ts. */
function buildJudgeCandidates(judgeProvider: ProviderId, judgeModel: string, participants: ProviderId[]): JudgeCandidate[] {
  return [
    { provider: judgeProvider, model: judgeModel },
    ...participants.filter((p) => p !== judgeProvider).map((p) => ({ provider: p, model: DEFAULT_MODEL_BY_PROVIDER[p] })),
  ];
}

function errorResult(message: string): CommitteeStepResult {
  return { status: "error", responseText: null, errorMessage: message, inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 0 };
}

/**
 * Executes exactly ONE stage-call (one LLM call) and returns immediately --
 * deliberately not a long-running multi-stage/multi-loop function. The
 * client (lib/committee/client.ts) decides what to call next and when,
 * firing concurrent requests per stage to reproduce "N providers at once"
 * without needing server-side concurrency inside a single invocation. See
 * the plan file's rationale: Vercel Hobby's short execution-time ceiling
 * ruled out one long streamed connection for the whole committee run.
 */
export async function runCommitteeStep(
  userId: number,
  committeeRunId: number,
  step: CommitteeStepRequest,
  signal: AbortSignal,
): Promise<CommitteeStepResult> {
  const run = await getCommitteeRun(userId, committeeRunId);
  if (!run) return errorResult("커미티 실행을 찾을 수 없습니다.");

  const mission = run.optimizedMission ?? run.mission;
  let providerId: ProviderId;
  let model: string;
  let systemPrompt: string | undefined;
  let userPrompt: string;
  let judgeAnswers: LabeledAnswer[] | null = null;
  // "Judge role" stages (prompt_optimize, judge) aren't tied to one specific
  // provider the way initial_draft/cross_review/self_reflect are -- they
  // just need *a* capable model to fill the role. judgeCandidates, when
  // set, routes the call through runJudgeWithFailover below instead of a
  // single getProvider(...).streamComplete(...) call, so the configured
  // judge provider being out of credits/quota doesn't take down every loop.
  let judgeCandidates: JudgeCandidate[] | null = null;

  if (step.action === "prompt_optimize") {
    providerId = run.judgeProvider;
    model = run.judgeModel;
    judgeCandidates = buildJudgeCandidates(run.judgeProvider, run.judgeModel, run.providers);
    systemPrompt = PROMPT_OPTIMIZE_SYSTEM_PROMPT;
    userPrompt = buildPromptOptimizeUserPrompt(run.mission, run.context);
  } else if (step.action === "initial_draft") {
    if (!step.provider) return errorResult("provider가 필요합니다.");
    providerId = step.provider;
    model = DEFAULT_MODEL_BY_PROVIDER[providerId];
    userPrompt = buildInitialDraftUserPrompt(mission, run.context);
  } else if (step.action === "cross_review") {
    if (!step.provider) return errorResult("provider가 필요합니다.");
    providerId = step.provider;
    model = DEFAULT_MODEL_BY_PROVIDER[providerId];
    const [ownAnswer, others] = await Promise.all([
      getLatestAnswer(userId, committeeRunId, providerId, step.loopNumber),
      getLatestAnswersExcept(userId, committeeRunId, providerId, step.loopNumber),
    ]);
    systemPrompt = CROSS_REVIEW_SYSTEM_PROMPT;
    userPrompt = buildCrossReviewUserPrompt(mission, providerId, ownAnswer ?? "(답변 없음)", others);
  } else if (step.action === "self_reflect") {
    if (!step.provider) return errorResult("provider가 필요합니다.");
    providerId = step.provider;
    model = DEFAULT_MODEL_BY_PROVIDER[providerId];
    const [ownAnswer, critiques] = await Promise.all([
      getLatestAnswer(userId, committeeRunId, providerId, step.loopNumber),
      getCrossReviewTexts(userId, committeeRunId, step.loopNumber, providerId),
    ]);
    systemPrompt = SELF_REFLECT_SYSTEM_PROMPT;
    userPrompt = buildSelfReflectUserPrompt(mission, ownAnswer ?? "(답변 없음)", critiques);
  } else {
    // judge -- sees every active provider's latest (self-reflected) answer this loop
    providerId = run.judgeProvider;
    model = run.judgeModel;
    judgeCandidates = buildJudgeCandidates(run.judgeProvider, run.judgeModel, run.providers);
    judgeAnswers = await getLatestAnswersExcept(userId, committeeRunId, null, step.loopNumber + 1);
    systemPrompt = JUDGE_SYSTEM_PROMPT;
    userPrompt = buildJudgeUserPrompt(mission, judgeAnswers);
  }

  const mergedSignal = AbortSignal.any([signal, AbortSignal.timeout(STEP_TIMEOUT_MS)]);
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  let rawText = "";
  let status: CommitteeStepStatus = "success";
  let errorMessage: string | null = null;
  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;

  if (judgeCandidates) {
    // Higher than the per-provider stages' 4096 below -- the judge synthesizes
    // every participant's full answer into one, which measurably runs long
    // enough (verified against a real run) to hit 4096 and cut off mid-sentence.
    const result = await runJudgeWithFailover(userId, judgeCandidates, { systemPrompt, userPrompt, maxTokens: 8192 }, mergedSignal);
    providerId = result.provider;
    model = result.model;
    rawText = result.resultText;
    status = result.status;
    errorMessage = result.errorMessage;
    inputTokens = result.inputTokens;
    outputTokens = result.outputTokens;
    costUsd = result.costUsd;
  } else {
    try {
      for await (const chunk of getProvider(providerId).streamComplete(
        userId,
        { model, systemPrompt, userPrompt, maxTokens: 4096 },
        mergedSignal,
      )) {
        if (chunk.type === "text-delta") rawText += chunk.text;
        if (chunk.type === "done") {
          inputTokens = chunk.inputTokens;
          outputTokens = chunk.outputTokens;
          costUsd = chunk.costUsd;
        }
        if (chunk.type === "error") {
          status = "error";
          errorMessage = chunk.message;
        }
      }
    } catch (err) {
      if (signal.aborted) {
        status = "error";
        errorMessage = "중지되었습니다.";
      } else {
        status = "error";
        errorMessage = formatProviderError(err, "알 수 없는 오류");
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const attemptNumber = await getNextAttemptNumber(userId, committeeRunId, step.loopNumber, step.action, providerId);

  let qualityScore: number | null | undefined;
  let finalText = rawText;
  if (step.action === "judge" && status === "success") {
    const parsed = parseQualityScore(rawText);
    qualityScore = parsed.score;
    finalText = parsed.text;
  }

  await insertCommitteeStageCall(userId, {
    committeeRunId,
    loopNumber: step.loopNumber,
    stage: step.action,
    provider: providerId,
    model,
    status,
    responseText: status === "success" ? finalText : null,
    errorMessage,
    attemptNumber,
    inputTokens,
    outputTokens,
    costUsd,
    durationMs,
    startedAt,
  });

  if (step.action === "prompt_optimize" && status === "success") {
    await updateOptimizedMission(userId, committeeRunId, finalText.trim());
  }

  if (step.action === "judge" && status === "success") {
    const participating = (judgeAnswers ?? []).map((a) => a.provider);
    const excluded = run.providers.filter((p) => !participating.includes(p));
    await insertCommitteeLoop(userId, {
      committeeRunId,
      loopNumber: step.loopNumber,
      status: "success",
      consensusText: finalText,
      qualityScore: qualityScore ?? null,
      qualityScoreRaw: rawText,
      participatingProviders: participating,
      excludedProviders: excluded,
      totalInputTokens: inputTokens,
      totalOutputTokens: outputTokens,
      totalCostUsd: costUsd,
      startedAt,
    });
  }

  return {
    status,
    responseText: status === "success" ? finalText : null,
    errorMessage,
    inputTokens,
    outputTokens,
    costUsd,
    durationMs,
    qualityScore,
  };
}
