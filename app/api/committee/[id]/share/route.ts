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
      if (summaryResult.status === "success" && summaryResult.resultText.trim()) {
        await setShareSummary(auth.id, committeeRunId, summaryResult.resultText.trim());
      }
    } catch {
      // Swallow -- see comment above.
    }
  }

  return NextResponse.json({ shareToken: result.shareToken });
}
