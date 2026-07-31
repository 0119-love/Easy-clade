import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionToken, findUserByEmail, markEmailVerified, verifyAndConsumeEmailVerificationCode } from "@/lib/auth/queries";
import { attachSessionCookie } from "@/lib/auth/session";
import { isValidEmail } from "@/lib/auth/validate";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/auth/rateLimit";

export const runtime = "nodejs";

const CODE_ERRORS: Record<string, string> = {
  invalid: "코드가 올바르지 않습니다.",
  expired: "코드가 만료되었습니다. 재전송을 눌러 다시 요청해주세요.",
  too_many_attempts: "시도 횟수를 초과했습니다. 코드를 다시 요청해주세요.",
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20; // generous -- per-code attempts are already capped server-side (see verifyAndConsumeEmailVerificationCode)

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<{ email: string; code: string }>;

  if (!isValidEmail(body.email) || typeof body.code !== "string" || !/^\d{6}$/.test(body.code)) {
    return NextResponse.json({ error: "코드가 올바르지 않습니다." }, { status: 400 });
  }

  if (!checkRateLimit(`verify-email:ip:${getClientIp(request)}`, MAX_ATTEMPTS, WINDOW_MS)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const user = await findUserByEmail(body.email);
  // A nonexistent account can never have a live code, so this naturally
  // collapses into the same "invalid" response -- no separate branch needed.
  const result = user ? await verifyAndConsumeEmailVerificationCode(user.id, body.code) : "invalid";
  if (result !== "ok" || !user) {
    return NextResponse.json({ error: CODE_ERRORS[result] ?? "코드가 올바르지 않습니다." }, { status: 400 });
  }

  await markEmailVerified(user.id);
  const { token, expiresAt } = await createSessionToken(user.id, true);
  const response = NextResponse.json({ email: user.email });
  attachSessionCookie(response, token, expiresAt);
  return response;
}
