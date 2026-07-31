import { NextResponse, type NextRequest } from "next/server";
import { deleteTask, setTaskDone } from "@/lib/tasks/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

interface PatchBody {
  done?: boolean;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = (await request.json()) as PatchBody;
  if (typeof body.done === "boolean") {
    await setTaskDone(auth.id, Number(id), body.done);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await deleteTask(auth.id, Number(id));
  return NextResponse.json({ ok: true });
}
