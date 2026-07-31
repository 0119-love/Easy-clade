import { NextResponse, type NextRequest } from "next/server";
import { deleteAgentPreset } from "@/lib/agents/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await deleteAgentPreset(auth.id, Number(id));
  return NextResponse.json({ ok: true });
}
