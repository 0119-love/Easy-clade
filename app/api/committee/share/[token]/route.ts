import { NextResponse, type NextRequest } from "next/server";
import { getPublicCommitteeRunByShareToken } from "@/lib/committee/queries";

export const runtime = "nodejs";

/**
 * The one committee endpoint with no requireUserContext call -- deliberately
 * public. proxy.ts's matcher already excludes /api/* from the login-gate
 * redirect, so this route being reachable without a session is the intended
 * behavior, not a gap. getPublicCommitteeRunByShareToken enforces its own
 * "safe to show a stranger" field allowlist.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const run = await getPublicCommitteeRunByShareToken(token);
  if (!run) return NextResponse.json({ error: "결과를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json(run);
}
