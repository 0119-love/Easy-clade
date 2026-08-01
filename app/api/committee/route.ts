import { NextResponse, type NextRequest } from "next/server";
import { PROVIDER_IDS, type ProviderId } from "@/lib/config/types";
import { requireUserContext } from "@/lib/auth/session";
import { DEFAULT_MODEL_BY_PROVIDER, MAX_MAX_LOOPS, MIN_MAX_LOOPS } from "@/lib/committee/defaults";
import { estimateCommitteeRun } from "@/lib/committee/estimate";
import { insertCommitteeRun } from "@/lib/committee/queries";
import { emptyCommitteeContext, type CommitteeContext } from "@/lib/committee/types";

export const runtime = "nodejs";

interface CommitteeCreateBody {
  mission: string;
  context?: Partial<CommitteeContext>;
  providers: ProviderId[];
  targetQualityScore: number;
  maxLoops: number;
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as CommitteeCreateBody;

  if (!body.mission?.trim()) {
    return NextResponse.json({ error: "미션을 입력하세요." }, { status: 400 });
  }
  const providers = (body.providers ?? []).filter((p): p is ProviderId => PROVIDER_IDS.includes(p));
  if (providers.length < 2) {
    // Same reasoning as PromptComposer.tsx's consensus/best-answer judge():
    // there's no peer to cross-review with fewer than 2 participants.
    return NextResponse.json({ error: "Committee를 실행하려면 프로바이더를 최소 2개 선택하세요." }, { status: 400 });
  }
  const maxLoops = Math.min(MAX_MAX_LOOPS, Math.max(MIN_MAX_LOOPS, Math.round(body.maxLoops) || MAX_MAX_LOOPS));
  const targetQualityScore = Math.min(100, Math.max(1, Math.round(body.targetQualityScore) || 100));

  const context: CommitteeContext = { ...emptyCommitteeContext(), ...body.context };
  const judgeProvider: ProviderId = providers.includes("anthropic") ? "anthropic" : providers[0];
  const judgeModel = DEFAULT_MODEL_BY_PROVIDER[judgeProvider];

  const { estimatedMaxCostUsd, estimatedMaxSeconds } = estimateCommitteeRun({
    mission: body.mission,
    context,
    providers,
    maxLoops,
    judgeProvider,
  });

  const committeeRunId = await insertCommitteeRun(auth.id, {
    mission: body.mission.trim(),
    context,
    providers,
    targetQualityScore,
    maxLoops,
    judgeProvider,
    judgeModel,
    estimatedCostUsd: estimatedMaxCostUsd,
    estimatedSeconds: estimatedMaxSeconds,
  });

  return NextResponse.json({ committeeRunId, estimatedCostUsd: estimatedMaxCostUsd, estimatedSeconds: estimatedMaxSeconds });
}
