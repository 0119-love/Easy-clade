import { NextResponse, type NextRequest } from "next/server";
import { requireUserContext } from "@/lib/auth/session";
import { runCommitteeStep } from "@/lib/committee/orchestrator";
import type { CommitteeStepRequest } from "@/lib/committee/types";

export const runtime = "nodejs";

/**
 * Executes exactly one stage-call (one LLM call) and returns. The client
 * (lib/committee/client.ts) is what decides the overall sequence/concurrency
 * -- see lib/committee/orchestrator.ts's doc comment for why this app can't
 * just run the whole multi-loop committee in one long-lived request
 * (Vercel Hobby's short execution-time ceiling).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = (await request.json()) as CommitteeStepRequest;

  const result = await runCommitteeStep(auth.id, Number(id), body, request.signal);
  return NextResponse.json(result);
}
