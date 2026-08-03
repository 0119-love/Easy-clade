import { NextResponse, type NextRequest } from "next/server";
import { requireUserContext } from "@/lib/auth/session";
import { getOrCreateShareToken, setShareSummary } from "@/lib/committee/queries";
import { runJudgeWithFailover, type JudgeCandidate } from "@/lib/providers/judgeWithFailover";
import { DEFAULT_MODEL_BY_PROVIDER } from "@/lib/committee/defaults";

export const runtime = "nodejs";

const SUMMARY_SYSTEM_PROMPT =
  "다음은 여러 AI가 합의한 보고서입니다. 이걸 처음 보는 사람이 3초 안에 훑어볼 수 있도록, 핵심만 3~4개의 짧은 불릿으로 요약하세요. 각 불릿은 20단어 이내, 마크다운 불릿(-)만 사용하고 다른 설명·서론·마무리 문장은 절대 쓰지 마세요.";

/** Mints (or reuses) a public share token for a finished, successful run -- see getOrCreateShareToken for the eligibility rule. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const committeeRunId = Number(id);
  const result = await getOrCreateShareToken(auth.id, committeeRunId);
  if (!result) {
    return NextResponse.json({ error: "완료된 성공 결과가 있어야 공유 링크를 만들 수 있습니다." }, { status: 400 });
  }

  // Best-effort, one-time: a failed summary call still leaves a working
  // share link (the page falls back to just the full report), so this
  // never blocks returning the token itself.
  if (result.needsSummary) {
    try {
      const candidates: JudgeCandidate[] = result.providers.map((p) => ({ provider: p, model: DEFAULT_MODEL_BY_PROVIDER[p] }));
      const controller = new AbortController();
      const summaryResult = await runJudgeWithFailover(
        auth.id,
        candidates,
        { systemPrompt: SUMMARY_SYSTEM_PROMPT, userPrompt: result.finalConsensusText, maxTokens: 300 },
        controller.signal,
      );
      const summaryText = summaryResult.resultText.trim();
      // Sanity check, not just "did the call succeed" -- a real run
      // produced a clean "success" status carrying only a couple of stray
      // words (an occasional short vendor response, not a stream error this
      // codebase surfaces as one). Requiring at least 2 bullet lines and a
      // minimum length rejects that silently instead of persisting a
      // one-word "summary" that reads as broken on the public page.
      const bulletCount = (summaryText.match(/^[-*]\s+/gm) ?? []).length;
      if (summaryResult.status === "success" && bulletCount >= 2 && summaryText.length >= 40) {
        await setShareSummary(auth.id, committeeRunId, summaryText);
      }
    } catch {
      // Swallow -- see comment above.
    }
  }

  return NextResponse.json({ shareToken: result.shareToken });
}
