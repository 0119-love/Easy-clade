import { getProvider } from "./registry";
import { formatProviderError } from "./errorMessage";
import type { ProviderId } from "../config/types";

/**
 * The "judge" role (picking a winner, synthesizing consensus, scoring
 * quality) is filled by whichever provider is passed in -- previously that
 * was one hardcoded/fixed provider per call site, so a single vendor's
 * outage (out of credits, rate-limited, down) failed the whole judge step
 * even when every other candidate model just answered fine seconds earlier.
 * This is the one place that decides who judges: given an ordered list of
 * candidates, it tries each in turn and returns the first success, so no
 * single vendor is a single point of failure for the judge role anymore.
 */
export interface JudgeCandidate {
  provider: ProviderId;
  model: string;
}

export interface JudgeCallSpec {
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
}

export interface JudgeAttempt {
  provider: ProviderId;
  model: string;
  errorMessage: string;
}

export interface JudgeCallResult {
  status: "success" | "error";
  provider: ProviderId;
  model: string;
  resultText: string;
  errorMessage: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  /** Every candidate tried before the one that succeeded (empty if the first candidate worked); on total failure, every candidate tried. */
  failedAttempts: JudgeAttempt[];
}

/** De-dupes candidates by provider, keeping the first occurrence's model -- the same provider listed twice would just fail the same way twice. */
function dedupeByProvider(candidates: JudgeCandidate[]): JudgeCandidate[] {
  const seen = new Set<ProviderId>();
  const out: JudgeCandidate[] = [];
  for (const c of candidates) {
    if (seen.has(c.provider)) continue;
    seen.add(c.provider);
    out.push(c);
  }
  return out;
}

export async function runJudgeWithFailover(
  userId: number,
  candidates: JudgeCandidate[],
  spec: JudgeCallSpec,
  signal: AbortSignal,
): Promise<JudgeCallResult> {
  const ordered = dedupeByProvider(candidates);
  const failedAttempts: JudgeAttempt[] = [];

  for (const candidate of ordered) {
    let resultText = "";
    let errorMessage: string | null = null;
    let inputTokens = 0;
    let outputTokens = 0;
    let costUsd = 0;

    try {
      for await (const chunk of getProvider(candidate.provider).streamComplete(
        userId,
        { model: candidate.model, systemPrompt: spec.systemPrompt, userPrompt: spec.userPrompt, maxTokens: spec.maxTokens },
        signal,
      )) {
        if (chunk.type === "text-delta") resultText += chunk.text;
        if (chunk.type === "done") {
          inputTokens = chunk.inputTokens;
          outputTokens = chunk.outputTokens;
          costUsd = chunk.costUsd;
        }
        if (chunk.type === "error") errorMessage = chunk.message;
      }
    } catch (err) {
      if (signal.aborted) {
        return {
          status: "error",
          provider: candidate.provider,
          model: candidate.model,
          resultText: "",
          errorMessage: "중지되었습니다.",
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
          failedAttempts,
        };
      }
      errorMessage = formatProviderError(err, "알 수 없는 오류");
    }

    if (!errorMessage && resultText) {
      return { status: "success", provider: candidate.provider, model: candidate.model, resultText, errorMessage: null, inputTokens, outputTokens, costUsd, failedAttempts };
    }

    failedAttempts.push({ provider: candidate.provider, model: candidate.model, errorMessage: errorMessage ?? "빈 응답" });
  }

  const last = ordered[ordered.length - 1];
  return {
    status: "error",
    provider: last.provider,
    model: last.model,
    resultText: "",
    errorMessage: failedAttempts.map((a) => `${a.provider}: ${a.errorMessage}`).join("\n"),
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    failedAttempts,
  };
}
