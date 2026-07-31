import { NextResponse, type NextRequest } from "next/server";
import { getIntegrations, insertIntegration, type IntegrationEventType } from "@/lib/integrations/queries";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ integrations: await getIntegrations(auth.id) });
}

interface PostBody {
  name?: string;
  webhookUrl?: string;
  eventType?: IntegrationEventType;
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as PostBody;
  if (!body.name?.trim() || !body.webhookUrl?.trim()) {
    return NextResponse.json({ error: "이름과 웹훅 URL을 모두 입력하세요." }, { status: 400 });
  }
  try {
    new URL(body.webhookUrl);
  } catch {
    return NextResponse.json({ error: "올바른 URL 형식이 아닙니다." }, { status: 400 });
  }
  const integration = await insertIntegration(auth.id, {
    name: body.name.trim(),
    webhookUrl: body.webhookUrl.trim(),
    eventType: body.eventType ?? "run_complete",
    enabled: true,
  });
  return NextResponse.json({ integration });
}
