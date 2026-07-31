import { NextResponse, type NextRequest } from "next/server";
import { deleteWorkflow, getWorkflow } from "@/lib/workflows/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const workflow = await getWorkflow(auth.id, Number(id));
  if (!workflow) return NextResponse.json({ error: "워크플로우를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ workflow });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await deleteWorkflow(auth.id, Number(id));
  return NextResponse.json({ ok: true });
}
