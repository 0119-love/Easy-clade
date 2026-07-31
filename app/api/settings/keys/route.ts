import { NextResponse, type NextRequest } from "next/server";
import { clearKey, getMaskedKeys, saveDailyBudget, saveKey } from "@/lib/config/keysStore";
import { requireUserContext } from "@/lib/auth/session";
import { PROVIDER_IDS, type DailyBudget, type ProviderId } from "@/lib/config/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await getMaskedKeys(auth.id));
}

interface PostBody {
  provider?: ProviderId;
  apiKey?: string;
  clear?: boolean;
  dailyBudget?: DailyBudget;
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as PostBody;

  if (body.dailyBudget) {
    await saveDailyBudget(auth.id, body.dailyBudget);
    return NextResponse.json(await getMaskedKeys(auth.id));
  }

  if (!body.provider || !PROVIDER_IDS.includes(body.provider)) {
    return NextResponse.json({ error: "잘못된 프로바이더입니다." }, { status: 400 });
  }

  if (body.clear) {
    await clearKey(auth.id, body.provider);
  } else if (body.apiKey) {
    await saveKey(auth.id, body.provider, body.apiKey);
  } else {
    return NextResponse.json({ error: "apiKey가 없습니다." }, { status: 400 });
  }

  return NextResponse.json(await getMaskedKeys(auth.id));
}
