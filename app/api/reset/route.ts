import { NextResponse, type NextRequest } from "next/server";
import { resetAllData } from "@/lib/resetAllData";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  await resetAllData(auth.id);
  return NextResponse.json({ ok: true });
}
