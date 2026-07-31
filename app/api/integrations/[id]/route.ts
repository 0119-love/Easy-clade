import { NextResponse, type NextRequest } from "next/server";
import { deleteIntegration, setIntegrationEnabled } from "@/lib/integrations/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

interface PatchBody {
  enabled?: boolean;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = (await request.json()) as PatchBody;
  if (typeof body.enabled === "boolean") {
    await setIntegrationEnabled(auth.id, Number(id), body.enabled);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await deleteIntegration(auth.id, Number(id));
  return NextResponse.json({ ok: true });
}
