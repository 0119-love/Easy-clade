import { NextResponse, type NextRequest } from "next/server";
import { getMemoryEntries, insertMemory } from "@/lib/memory/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ entries: await getMemoryEntries(auth.id) });
}

interface PostBody {
  content?: string;
  pinned?: boolean;
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as PostBody;
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "내용을 입력하세요." }, { status: 400 });
  }
  const entry = await insertMemory(auth.id, { content: body.content.trim(), pinned: body.pinned ?? true });
  return NextResponse.json({ entry });
}
