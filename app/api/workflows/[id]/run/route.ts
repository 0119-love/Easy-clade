import { NextResponse, type NextRequest } from "next/server";
import { getWorkflow } from "@/lib/workflows/queries";
import { runWorkflowSteps } from "@/lib/workflows/runWorkflow";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const workflow = await getWorkflow(auth.id, Number(id));
  if (!workflow) {
    return NextResponse.json({ error: "워크플로우를 찾을 수 없습니다." }, { status: 404 });
  }
  const results = await runWorkflowSteps(auth.id, workflow.steps);
  return NextResponse.json({ results });
}
