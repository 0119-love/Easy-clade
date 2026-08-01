import type { ProviderId } from "../config/types";
import { useCommitteeStore } from "../store/committeeStore";
import type { CommitteeRunRequest, CommitteeStepRequest, CommitteeStepResult } from "./types";

const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [1000, 3000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Module-level, deliberately outside Zustand (same reasoning as
// lib/store/abortControllers.ts) -- a "should we stop" flag and in-flight
// fetch controllers aren't reactive state, they're plumbing.
let stopRequested = false;
const activeControllers = new Set<AbortController>();

/** Sets a flag the running orchestration loop checks between steps, and aborts whatever's in flight right now. */
export function stopCommittee(): void {
  stopRequested = true;
  for (const controller of activeControllers) controller.abort();
}

function emptyResult(errorMessage: string): CommitteeStepResult {
  return { status: "error", responseText: null, errorMessage, inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 0 };
}

async function callStep(committeeRunId: number, step: CommitteeStepRequest): Promise<CommitteeStepResult> {
  const controller = new AbortController();
  activeControllers.add(controller);
  try {
    const res = await fetch(`/api/committee/${committeeRunId}/step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(step),
      signal: controller.signal,
    });
    if (!res.ok) return emptyResult(`요청 실패 (${res.status})`);
    return (await res.json()) as CommitteeStepResult;
  } catch (err) {
    return emptyResult(err instanceof Error ? err.message : "알 수 없는 오류");
  } finally {
    activeControllers.delete(controller);
  }
}

/** Retries the SAME step across separate short-lived requests (not inside one) -- keeps every single invocation to one LLM call's worth of duration. */
async function callStepWithRetry(committeeRunId: number, step: CommitteeStepRequest): Promise<CommitteeStepResult> {
  let last = emptyResult("중지됨");
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (stopRequested) return emptyResult("중지됨");
    last = await callStep(committeeRunId, step);
    if (last.status === "success") return last;
    if (attempt < MAX_RETRIES) await sleep(RETRY_DELAYS_MS[attempt]);
  }
  return last;
}

interface BestLoop {
  loopNumber: number;
  qualityScore: number | null;
  consensusText: string | null;
}

function isBetterLoop(candidate: { qualityScore: number | null }, current: BestLoop | null): boolean {
  if (!current) return true;
  if (candidate.qualityScore === null) return false;
  if (current.qualityScore === null) return true;
  return candidate.qualityScore > current.qualityScore;
}

async function runProviderStage(
  committeeRunId: number,
  stage: "initial_draft" | "cross_review" | "self_reflect",
  providers: ProviderId[],
  loopNumber: number,
): Promise<Array<{ provider: ProviderId; result: CommitteeStepResult }>> {
  const store = useCommitteeStore.getState();
  for (const provider of providers) store.setStageStatus(loopNumber, stage, provider, "running");
  return Promise.all(
    providers.map(async (provider) => {
      const result = await callStepWithRetry(committeeRunId, { action: stage, provider, loopNumber });
      useCommitteeStore
        .getState()
        .setStageStatus(loopNumber, stage, provider, result.status === "success" ? "success" : "error", result.errorMessage ?? undefined);
      return { provider, result };
    }),
  );
}

function sumCosts(results: Array<{ result: CommitteeStepResult }>): { costUsd: number; inputTokens: number; outputTokens: number } {
  return results.reduce(
    (acc, r) => ({
      costUsd: acc.costUsd + r.result.costUsd,
      inputTokens: acc.inputTokens + r.result.inputTokens,
      outputTokens: acc.outputTokens + r.result.outputTokens,
    }),
    { costUsd: 0, inputTokens: 0, outputTokens: 0 },
  );
}

/**
 * Drives the whole committee run from the browser: creates the run, then
 * fires a sequence of short single-LLM-call requests, firing each stage's
 * per-provider calls concurrently (Promise.all) to reproduce "N providers at
 * once" without needing one long server-side connection. See the plan
 * file / lib/committee/orchestrator.ts for why (Vercel Hobby's short
 * execution-time ceiling ruled out a single long-lived stream for the
 * whole run).
 */
export async function runCommittee(request: CommitteeRunRequest): Promise<void> {
  stopRequested = false;
  const store = useCommitteeStore.getState();
  store.reset();

  const createRes = await fetch("/api/committee", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!createRes.ok) {
    const data = (await createRes.json().catch(() => ({}))) as { error?: string };
    store.fail(data.error ?? "커미티 실행을 시작하지 못했습니다.");
    return;
  }
  const { committeeRunId, estimatedCostUsd, estimatedSeconds } = (await createRes.json()) as {
    committeeRunId: number;
    estimatedCostUsd: number;
    estimatedSeconds: number;
  };
  store.start(committeeRunId, estimatedCostUsd, estimatedSeconds);

  store.setStageStatus(0, "prompt_optimize", null, "running");
  const optimizeResult = await callStepWithRetry(committeeRunId, { action: "prompt_optimize", loopNumber: 0 });
  if (optimizeResult.status === "success") {
    store.setStageStatus(0, "prompt_optimize", null, "success");
    store.setOptimizedMission(optimizeResult.responseText);
  } else {
    // Not fatal -- the server falls back to the raw mission if no optimized version was ever saved.
    store.setStageStatus(0, "prompt_optimize", null, "error", optimizeResult.errorMessage ?? undefined);
  }

  const draftResults = await runProviderStage(committeeRunId, "initial_draft", request.providers, 0);
  // Not reassigned after this -- a provider that fails mid-run keeps its
  // last-known answer server-side and is retried again next loop (see the
  // comment further down), so the active set itself never needs to shrink/grow here.
  const activeProviders = draftResults.filter((d) => d.result.status === "success").map((d) => d.provider);

  let totalCostUsd = optimizeResult.costUsd;
  let totalInputTokens = optimizeResult.inputTokens;
  let totalOutputTokens = optimizeResult.outputTokens;
  const draftTotals = sumCosts(draftResults);
  totalCostUsd += draftTotals.costUsd;
  totalInputTokens += draftTotals.inputTokens;
  totalOutputTokens += draftTotals.outputTokens;

  if (activeProviders.length < 2) {
    store.fail("초안 생성에 실패한 프로바이더가 너무 많아 진행할 수 없습니다. 잠시 후 다시 시도해주세요.");
    await postFinalize(committeeRunId, {
      status: "error",
      finalConsensusText: null,
      finalQualityScore: null,
      bestLoopNumber: null,
      totalCostUsd,
      totalInputTokens,
      totalOutputTokens,
      errorMessage: "초안 생성 실패",
    });
    return;
  }

  let bestLoop: BestLoop | null = null;

  for (let loopNumber = 1; loopNumber <= request.maxLoops; loopNumber++) {
    if (stopRequested) break;
    store.setCurrentLoop(loopNumber);

    const reviewResults = await runProviderStage(committeeRunId, "cross_review", activeProviders, loopNumber);
    const reviewTotals = sumCosts(reviewResults);
    totalCostUsd += reviewTotals.costUsd;
    totalInputTokens += reviewTotals.inputTokens;
    totalOutputTokens += reviewTotals.outputTokens;
    if (stopRequested) break;

    const reflectResults = await runProviderStage(committeeRunId, "self_reflect", activeProviders, loopNumber);
    const reflectTotals = sumCosts(reflectResults);
    totalCostUsd += reflectTotals.costUsd;
    totalInputTokens += reflectTotals.inputTokens;
    totalOutputTokens += reflectTotals.outputTokens;
    if (stopRequested) break;

    // A provider that fails this loop keeps its last-known answer
    // server-side (getLatestAnswer looks back across earlier loops) and
    // gets retried again next loop -- only providers that never succeeded
    // even once are permanently out (activeProviders never grows back for
    // those, since getLatestAnswer would still find nothing for them).

    store.setStageStatus(loopNumber, "judge", null, "running");
    const judgeResult = await callStepWithRetry(committeeRunId, { action: "judge", loopNumber });
    totalCostUsd += judgeResult.costUsd;
    totalInputTokens += judgeResult.inputTokens;
    totalOutputTokens += judgeResult.outputTokens;

    if (judgeResult.status === "success") {
      store.setStageStatus(loopNumber, "judge", null, "success");
      const qualityScore = judgeResult.qualityScore ?? null;
      const consensusText = judgeResult.responseText;
      const excludedProviders = request.providers.filter((p) => !activeProviders.includes(p));
      store.completeLoop({
        loopNumber,
        status: "success",
        qualityScore,
        consensusText,
        participatingProviders: activeProviders,
        excludedProviders,
      });
      if (isBetterLoop({ qualityScore }, bestLoop)) bestLoop = { loopNumber, qualityScore, consensusText };
      if (qualityScore !== null && qualityScore >= request.targetQualityScore) break;
    } else {
      store.setStageStatus(loopNumber, "judge", null, "error", judgeResult.errorMessage ?? undefined);
      store.completeLoop({
        loopNumber,
        status: "error",
        qualityScore: null,
        consensusText: null,
        participatingProviders: activeProviders,
        excludedProviders: [],
      });
    }
  }

  const finalStatus = stopRequested ? "stopped" : bestLoop ? "success" : "error";
  store.finish(finalStatus, bestLoop?.consensusText ?? null, bestLoop?.qualityScore ?? null, bestLoop?.loopNumber ?? null);

  await postFinalize(committeeRunId, {
    status: finalStatus,
    finalConsensusText: bestLoop?.consensusText ?? null,
    finalQualityScore: bestLoop?.qualityScore ?? null,
    bestLoopNumber: bestLoop?.loopNumber ?? null,
    totalCostUsd,
    totalInputTokens,
    totalOutputTokens,
    errorMessage: finalStatus === "error" ? "목표 품질 점수에 도달하지 못했습니다." : null,
  });
}

async function postFinalize(
  committeeRunId: number,
  body: {
    status: "success" | "error" | "stopped";
    finalConsensusText: string | null;
    finalQualityScore: number | null;
    bestLoopNumber: number | null;
    totalCostUsd: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    errorMessage: string | null;
  },
): Promise<void> {
  await fetch(`/api/committee/${committeeRunId}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
