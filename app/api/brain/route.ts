import { NextResponse, type NextRequest } from "next/server";
import { getBrainStatus } from "@/lib/brain/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const status = await getBrainStatus(auth.id);
  return NextResponse.json(status);
}
