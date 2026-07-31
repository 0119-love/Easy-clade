import { NextResponse, type NextRequest } from "next/server";
import { anthropicProvider } from "@/lib/providers/anthropic";
import { openaiProvider } from "@/lib/providers/openai";
import { googleProvider } from "@/lib/providers/google";
import { xaiProvider } from "@/lib/providers/xai";
import { perplexityProvider } from "@/lib/providers/perplexity";
import { deepseekProvider } from "@/lib/providers/deepseek";
import { recordCallResult, sanitizeErrorMessage } from "@/lib/config/keysStore";
import { requireUserContext } from "@/lib/auth/session";
import { PROVIDER_IDS, type ProviderId } from "@/lib/config/types";
import type { Provider } from "@/lib/providers/types";

export const runtime = "nodejs";

// Test-connection always exercises the REAL provider, regardless of
// MOCK_PROVIDERS -- its entire purpose is validating the key the user just typed.
const REAL_PROVIDERS: Record<ProviderId, Provider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  google: googleProvider,
  xai: xaiProvider,
  perplexity: perplexityProvider,
  deepseek: deepseekProvider,
};

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as { provider?: ProviderId };
  if (!body.provider || !PROVIDER_IDS.includes(body.provider)) {
    return NextResponse.json({ success: false, message: "잘못된 프로바이더입니다." }, { status: 400 });
  }

  const provider = REAL_PROVIDERS[body.provider];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const models = await provider.listModels();
    for await (const chunk of provider.streamComplete(
      auth.id,
      { model: models[0].id, userPrompt: 'Say "OK" and nothing else.', maxTokens: 16 },
      controller.signal,
    )) {
      if (chunk.type === "error") {
        const sanitized = await sanitizeErrorMessage(auth.id, chunk.message, body.provider);
        await recordCallResult(auth.id, body.provider, "error", sanitized);
        return NextResponse.json({ success: false, message: sanitized });
      }
      if (chunk.type === "done") {
        await recordCallResult(auth.id, body.provider, "success");
        return NextResponse.json({ success: true });
      }
    }
    return NextResponse.json({ success: false, message: "결과 없이 스트림이 종료되었습니다." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    const sanitized = await sanitizeErrorMessage(auth.id, message, body.provider);
    await recordCallResult(auth.id, body.provider, "error", sanitized);
    return NextResponse.json({ success: false, message: sanitized });
  } finally {
    clearTimeout(timeout);
  }
}
