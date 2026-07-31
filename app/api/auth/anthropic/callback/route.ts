import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeForTokens } from "@/lib/auth/anthropicOAuth";
import { saveOAuthTokens } from "@/lib/config/keysStore";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * Called by the Chrome extension (extension/background.js) after the user
 * approves the Anthropic OAuth prompt. The extension never talks to
 * Anthropic's token endpoint directly -- it only ever gets an authorization
 * `code`, which is useless without the code_verifier that generated the
 * matching challenge. Doing the exchange here, server-side, keeps the
 * resulting access/refresh tokens out of extension storage entirely; they
 * land straight in this account's per-user config.json via the same
 * keysStore the manual API-key flow uses -- which means this route now
 * DOES need the caller's login session, to know which account to save to.
 */

// Extensions call this from a chrome-extension:// origin, which needs an
// explicit CORS allow, AND Allow-Credentials so the extension's
// `credentials: "include"` fetch actually carries this app's session cookie.
function corsHeaders(origin: string | null) {
  const headers = new Headers();
  if (origin?.startsWith("chrome-extension://")) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  return headers;
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

interface CallbackBody {
  code?: string;
  codeVerifier?: string;
  redirectUri?: string;
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));

  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) {
    return NextResponse.json({ ok: false, error: "인증이 필요합니다. 먼저 웹 앱에 로그인해주세요." }, { status: 401, headers });
  }

  const body = (await request.json()) as CallbackBody;

  if (!body.code || !body.codeVerifier || !body.redirectUri) {
    return NextResponse.json({ error: "code, codeVerifier, redirectUri가 모두 필요합니다." }, { status: 400, headers });
  }

  try {
    const tokens = await exchangeCodeForTokens({
      code: body.code,
      codeVerifier: body.codeVerifier,
      redirectUri: body.redirectUri,
    });
    await saveOAuthTokens(auth.id, "anthropic", tokens);
    return NextResponse.json({ ok: true }, { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류로 연결에 실패했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 502, headers });
  }
}
