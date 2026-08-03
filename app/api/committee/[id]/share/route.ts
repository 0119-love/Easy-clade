import { NextResponse, type NextRequest } from "next/server";
import { requireUserContext } from "@/lib/auth/session";
import { getOrCreateShareToken } from "@/lib/committee/queries";

export const runtime = "nodejs";

/** Mints (or reuses) a public share token for a finished, successful run -- see getOrCreateShareToken for the eligibility rule. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const shareToken = await getOrCreateShareToken(auth.id, Number(id));
  if (!shareToken) {
    return NextResponse.json({ error: "완료된 성공 결과가 있어야 공유 링크를 만들 수 있습니다." }, { status: 400 });
  }

  return NextResponse.json({ shareToken });
}
