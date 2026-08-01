import { NextResponse, type NextRequest } from "next/server";
import { requireUserContext } from "@/lib/auth/session";
import { finalizeCommitteeRun } from "@/lib/committee/queries";
import type { CommitteeFinalizeRequest } from "@/lib/committee/types";

export const runtime = "nodejs";

/**
 * Writes the run's final state -- called both on normal completion (target
 * score hit or maxLoops exhausted) and on a user-initiated stop (status:
 * "stopped"). There's no separate /stop endpoint: the client already holds
 * every number this needs (it received each loop's judge result as the run
 * progressed), and "stopping" itself is really just the client no longer
 * firing further step requests -- this call only records the outcome.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = (await request.json()) as CommitteeFinalizeRequest;

  await finalizeCommitteeRun(auth.id, Number(id), {
    status: body.status,
    finalConsensusText: body.finalConsensusText,
    finalQualityScore: body.finalQualityScore,
    bestLoopNumber: body.bestLoopNumber,
    totalCostUsd: body.totalCostUsd,
    totalInputTokens: body.totalInputTokens,
    totalOutputTokens: body.totalOutputTokens,
    errorMessage: body.errorMessage ?? null,
  });

  return NextResponse.json({ ok: true });
}
