import { NextResponse, type NextRequest } from "next/server";
import { getRunsPaginated, getTodayStats, localMidnightIso, type RunStatus } from "@/lib/history/queries";
import { PROVIDER_IDS, type ProviderId } from "@/lib/config/types";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const providerParam = searchParams.get("provider");
  const statusParam = searchParams.get("status") as RunStatus | null;
  const projectIdParam = searchParams.get("projectId");
  const limit = Number(searchParams.get("limit") ?? "20");
  const offset = Number(searchParams.get("offset") ?? "0");

  const provider =
    providerParam && PROVIDER_IDS.includes(providerParam as ProviderId) ? (providerParam as ProviderId) : undefined;

  const { runs, total } = await getRunsPaginated(auth.id, {
    provider,
    status: statusParam ?? undefined,
    projectId: projectIdParam ? Number(projectIdParam) : undefined,
    limit,
    offset,
  });
  const today = await getTodayStats(auth.id, localMidnightIso());

  return NextResponse.json({ runs, total, today });
}
