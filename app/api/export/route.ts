import { NextResponse, type NextRequest } from "next/server";
import { getAllRuns } from "@/lib/history/queries";
import { getTasks } from "@/lib/tasks/queries";
import { getMemoryEntries } from "@/lib/memory/queries";
import { getKnowledgeItems } from "@/lib/knowledge/queries";
import { getAgentPresets } from "@/lib/agents/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    runs: await getAllRuns(auth.id),
    tasks: await getTasks(auth.id),
    memoryEntries: await getMemoryEntries(auth.id),
    knowledgeItems: await getKnowledgeItems(auth.id),
    agentPresets: await getAgentPresets(auth.id),
  });
}
