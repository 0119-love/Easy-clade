import { NextResponse, type NextRequest } from "next/server";
import { getWorkflows, insertWorkflow, type WorkflowStep } from "@/lib/workflows/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ workflows: await getWorkflows(auth.id) });
}

interface PostBody {
  name?: string;
  steps?: WorkflowStep[];
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as PostBody;
  if (!body.name?.trim() || !body.steps?.length) {
    return NextResponse.json({ error: "이름과 최소 한 개의 단계를 입력하세요." }, { status: 400 });
  }
  const workflow = await insertWorkflow(auth.id, { name: body.name.trim(), steps: body.steps });
  return NextResponse.json({ workflow });
}
