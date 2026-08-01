import { NextResponse, type NextRequest } from "next/server";
import { getBrainSnapshot } from "@/lib/brain/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const regions = await getBrainSnapshot(auth.id);
  return NextResponse.json({ regions, generatedAt: new Date().toISOString() });
}
