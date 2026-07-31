import { NextResponse, type NextRequest } from "next/server";
import { getPreferences, savePreferences } from "@/lib/config/keysStore";
import { requireUserContext } from "@/lib/auth/session";
import type { Preferences } from "@/lib/config/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await getPreferences(auth.id));
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as Preferences;
  await savePreferences(auth.id, body);
  return NextResponse.json(await getPreferences(auth.id));
}
