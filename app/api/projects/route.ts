import { NextResponse, type NextRequest } from "next/server";
import { getProjects, insertProject } from "@/lib/projects/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("includeArchived") === "true";
  return NextResponse.json({ projects: await getProjects(auth.id, includeArchived) });
}

interface PostBody {
  name?: string;
  description?: string | null;
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as PostBody;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "이름을 입력하세요." }, { status: 400 });
  }
  const project = await insertProject(auth.id, { name: body.name.trim(), description: body.description?.trim() || null });
  return NextResponse.json({ project });
}
