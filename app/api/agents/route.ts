import { NextResponse, type NextRequest } from "next/server";
import { getAgentPresets, insertAgentPreset, type AgentCategory } from "@/lib/agents/queries";
import { PROVIDER_IDS, type ProviderId } from "@/lib/config/types";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ presets: await getAgentPresets(auth.id) });
}

interface PostBody {
  name?: string;
  provider?: ProviderId;
  model?: string;
  systemPrompt?: string | null;
  temperature?: number;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  description?: string | null;
  category?: AgentCategory;
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as PostBody;
  if (!body.name?.trim() || !body.provider || !PROVIDER_IDS.includes(body.provider) || !body.model?.trim()) {
    return NextResponse.json({ error: "이름, 프로바이더, 모델을 모두 입력하세요." }, { status: 400 });
  }
  const preset = await insertAgentPreset(auth.id, {
    name: body.name.trim(),
    provider: body.provider,
    model: body.model.trim(),
    systemPrompt: body.systemPrompt?.trim() || null,
    temperature: body.temperature ?? 1,
    effort: body.effort ?? "medium",
    description: body.description?.trim() || null,
    category: body.category ?? "custom",
  });
  return NextResponse.json({ preset });
}
