import { NextResponse, type NextRequest } from "next/server";
import { getBrainGraph } from "@/lib/brain/graph";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const graph = await getBrainGraph(auth.id);
  return NextResponse.json(graph);
}
