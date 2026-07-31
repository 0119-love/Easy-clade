import { NextResponse, type NextRequest } from "next/server";
import { deleteMemory, setMemoryPinned } from "@/lib/memory/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

interface PatchBody {
  pinned?: boolean;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = (await request.json()) as PatchBody;
  if (typeof body.pinned === "boolean") {
    await setMemoryPinned(auth.id, Number(id), body.pinned);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await deleteMemory(auth.id, Number(id));
  return NextResponse.json({ ok: true });
}
