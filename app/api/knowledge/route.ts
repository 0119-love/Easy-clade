import { NextResponse, type NextRequest } from "next/server";
import { getKnowledgeItems, insertKnowledge } from "@/lib/knowledge/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q") ?? undefined;
  return NextResponse.json({ items: await getKnowledgeItems(auth.id, search) });
}

interface PostBody {
  title?: string;
  content?: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as PostBody;
  if (!body.title?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: "제목과 내용을 모두 입력하세요." }, { status: 400 });
  }
  const item = await insertKnowledge(auth.id, { title: body.title.trim(), content: body.content.trim() });
  return NextResponse.json({ item });
}
