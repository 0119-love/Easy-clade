import { NextResponse, type NextRequest } from "next/server";
import { deleteProject, getProject, setProjectArchived } from "@/lib/projects/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const project = await getProject(auth.id, Number(id));
  if (!project) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ project });
}

interface PatchBody {
  archived?: boolean;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = (await request.json()) as PatchBody;
  if (typeof body.archived === "boolean") {
    await setProjectArchived(auth.id, Number(id), body.archived);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await deleteProject(auth.id, Number(id));
  return NextResponse.json({ ok: true });
}
