import { NextResponse, type NextRequest } from "next/server";
import { getTasks, insertTask } from "@/lib/tasks/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ tasks: await getTasks(auth.id) });
}

interface PostBody {
  title?: string;
  sourceRunId?: number | null;
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as PostBody;
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "제목을 입력하세요." }, { status: 400 });
  }
  const task = await insertTask(auth.id, { title: body.title.trim(), sourceRunId: body.sourceRunId ?? null });
  return NextResponse.json({ task });
}
