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

  try {
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
  } catch (err) {
    // Errors from lib/config/crypto.ts (missing/malformed CONFIG_ENCRYPTION_KEY)
    // or the DB layer never contain the secret itself, so it's safe to relay
    // the message to the client -- without this, Next.js's default 500
    // handling hides the real cause and the UI can only show a generic
    // "저장에 실패했습니다".
    console.error("[settings/keys] save failed:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류로 저장에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
