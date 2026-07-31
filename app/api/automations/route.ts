import { NextResponse, type NextRequest } from "next/server";
import {
  getAutomations,
  insertAutomation,
  type AutomationCategory,
  type AutomationOutputType,
  type TriggerType,
} from "@/lib/automations/queries";
import { PROVIDER_IDS, type ProviderId } from "@/lib/config/types";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ automations: await getAutomations(auth.id) });
}

interface PostBody {
  name?: string;
  promptTemplate?: string;
  provider?: ProviderId;
  model?: string;
  triggerType?: TriggerType;
  intervalMinutes?: number | null;
  outputType?: AutomationOutputType;
  filename?: string | null;
  category?: AutomationCategory;
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as PostBody;
  if (
    !body.name?.trim() ||
    !body.promptTemplate?.trim() ||
    !body.provider ||
    !PROVIDER_IDS.includes(body.provider) ||
    !body.model?.trim()
  ) {
    return NextResponse.json({ error: "이름, 프롬프트, 프로바이더, 모델을 모두 입력하세요." }, { status: 400 });
  }
  const automation = await insertAutomation(auth.id, {
    name: body.name.trim(),
    promptTemplate: body.promptTemplate.trim(),
    provider: body.provider,
    model: body.model.trim(),
    triggerType: body.triggerType ?? "manual",
    intervalMinutes: body.triggerType === "interval" ? body.intervalMinutes ?? 60 : null,
    outputType: body.outputType ?? "text",
    filename: body.filename?.trim() || null,
    category: body.category ?? "custom",
  });
  return NextResponse.json({ automation });
}
