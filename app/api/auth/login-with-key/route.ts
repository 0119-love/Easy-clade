import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionToken, findUserById } from "@/lib/auth/queries";
import { attachSessionCookie } from "@/lib/auth/session";
import { findUserIdByAnthropicKey } from "@/lib/config/keysStore";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/auth/rateLimit";

export const runtime = "nodejs";

const NOT_FOUND = {
  error: "이 API 키로 등록된 계정을 찾을 수 없습니다. 이메일로 먼저 로그인해서 설정에서 API 키를 등록해주세요.",
} as const;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<{ apiKey: string }>;
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

  if (!apiKey) {
    return NextResponse.json({ error: "API 키를 입력해주세요." }, { status: 400 });
  }
  if (!checkRateLimit(`login-with-key:ip:${getClientIp(request)}`, MAX_ATTEMPTS, WINDOW_MS)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const userId = await findUserIdByAnthropicKey(apiKey);
  const user = userId ? await findUserById(userId) : null;
  if (!user) {
    return NextResponse.json(NOT_FOUND, { status: 401 });
  }

  const { token, expiresAt } = await createSessionToken(user.id, true);
  const response = NextResponse.json({ email: user.email });
  attachSessionCookie(response, token, expiresAt);
  return response;
}
