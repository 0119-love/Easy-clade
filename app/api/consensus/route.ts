import { NextResponse, type NextRequest } from "next/server";
import { insertJudgeRun } from "@/lib/history/queries";
import { runJudgeWithFailover } from "@/lib/providers/judgeWithFailover";
import { fireWebhooks } from "@/lib/integrations/fireWebhooks";
import { PROVIDER_LABELS, type ProviderId } from "@/lib/config/types";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

interface ConsensusRequestBody {
  runGroupId: string;
  mode: "consensus" | "best_answer";
  responses: Array<{ provider: ProviderId; model: string; text: string }>;
  judgeProvider?: ProviderId;
  judgeModel?: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as ConsensusRequestBody;

  if (!body.responses || body.responses.length === 0) {
    return NextResponse.json({ error: "채점할 응답이 없습니다." }, { status: 400 });
  }

  // Central judge failover, not a single hardcoded/preferred vendor: try
  // every candidate provider that just answered this prompt, in order,
  // until one succeeds as judge. A caller-supplied judgeProvider (if any)
  // goes first as a preference, but it's no longer a single point of
  // failure -- if it's out of credits/quota, the next candidate takes over
  // instead of failing the whole comparison.
  const candidates = body.judgeProvider
    ? [{ provider: body.judgeProvider, model: body.judgeModel ?? body.responses[0].model }, ...body.responses]
    : body.responses;

  const labeled = body.responses
    .map((r) => `### ${PROVIDER_LABELS[r.provider]} (${r.model})\n${r.text}`)
    .join("\n\n");

  const systemPrompt =
    body.mode === "consensus"
      ? "You are comparing responses from multiple AI models to the same prompt. Synthesize the points of agreement into a single answer, and explicitly call out any real disagreement between the models rather than papering over it."
      : "You are comparing responses from multiple AI models to the same prompt. Pick the single best response and justify the choice in 2-3 sentences. If none is clearly best, pick the one you'd keep anyway. Then, on its own final line with nothing else on it, output exactly `WINNER_MODEL: <model id>`, copying one of the model ids given above verbatim.";

  const startedAt = new Date().toISOString();
  const controller = new AbortController();

  const judgeResult = await runJudgeWithFailover(
    auth.id,
    candidates,
    { systemPrompt, userPrompt: labeled, maxTokens: 2048 },
    controller.signal,
  );
  const judgeProvider = judgeResult.provider;
  const judgeModel = judgeResult.model;
  let resultText = judgeResult.resultText;
  const errorMessage = judgeResult.errorMessage;
  const inputTokens = judgeResult.inputTokens;
  const outputTokens = judgeResult.outputTokens;
  const costUsd = judgeResult.costUsd;

  // Cost Killer's data source: pull the judge's `WINNER_MODEL: <id>` line
  // back out and match it to one of the actual candidates, then strip it so
  // the user-facing text doesn't show the raw marker.
  //
  // Matches against the literal candidate ids rather than a bare `\S+`
  // anchored to end-of-string -- judges don't reliably end the reply with
  // nothing but the marker (a trailing period, a stray blank line, or the
  // marker appearing mid-paragraph all defeated the old `\S+\s*$` pattern
  // and silently dropped the winner instead of erroring, so this went
  // unnoticed rather than failing loudly).
  let winnerProvider: ProviderId | null = null;
  let winnerModel: string | null = null;
  if (body.mode === "best_answer" && resultText) {
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const modelAlternation = body.responses.map((r) => escapeRegExp(r.model)).join("|");
    const match = new RegExp(`WINNER_MODEL:\\s*(${modelAlternation})\\b`, "i").exec(resultText);
    if (match) {
      const candidate = body.responses.find((r) => r.model === match[1]);
      if (candidate) {
        winnerProvider = candidate.provider;
        winnerModel = candidate.model;
        resultText = (resultText.slice(0, match.index) + resultText.slice(match.index + match[0].length)).trim();
      }
    }
  }

  const completedAt = new Date().toISOString();

  await insertJudgeRun(auth.id, {
    runGroupId: body.runGroupId,
    mode: body.mode,
    judgeProvider,
    judgeModel,
    resultText: resultText || null,
    errorMessage,
    inputTokens,
    outputTokens,
    costUsd,
    startedAt,
    completedAt,
    winnerProvider,
    winnerModel,
  });

  void fireWebhooks(auth.id, "consensus_complete", { mode: body.mode, resultText: resultText || null, errorMessage });

  if (errorMessage) {
    return NextResponse.json({ error: errorMessage });
  }

  return NextResponse.json({ resultText, inputTokens, outputTokens, costUsd });
}
