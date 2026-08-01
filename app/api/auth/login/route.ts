import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionToken, findUserByEmail } from "@/lib/auth/queries";
import { verifyPassword } from "@/lib/auth/passwords";
import { attachSessionCookie } from "@/lib/auth/session";
import { isValidEmail } from "@/lib/auth/validate";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/auth/rateLimit";

export const runtime = "nodejs";

interface LoginBody {
  email: string;
  password: string;
  remember?: boolean;
}

const INVALID_CREDENTIALS = { error: "이메일 또는 비밀번호가 올바르지 않습니다." } as const;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 35;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<LoginBody>;

  if (!isValidEmail(body.email) || typeof body.password !== "string") {
    return NextResponse.json(INVALID_CREDENTIALS, { status: 401 });
  }

  // Limited by IP and by target email separately -- an attacker rotating
  // IPs still can't grind one account, and one IP still can't grind many.
  const ip = getClientIp(request);
  const emailKey = body.email.trim().toLowerCase();
  if (!checkRateLimit(`login:ip:${ip}`, MAX_ATTEMPTS, WINDOW_MS) || !checkRateLimit(`login:email:${emailKey}`, MAX_ATTEMPTS, WINDOW_MS)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const user = await findUserByEmail(body.email);
  // passwordHash is null for accounts created via Google/GitHub login --
  // treat that exactly like a wrong password instead of erroring.
  if (!user || !user.passwordHash || !(await verifyPassword(body.password, user.passwordHash))) {
    return NextResponse.json(INVALID_CREDENTIALS, { status: 401 });
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "이메일 인증이 필요합니다.", needsVerification: true, email: user.email },
      { status: 403 },
    );
  }

  const { token, expiresAt } = await createSessionToken(user.id, body.remember ?? false);
  const response = NextResponse.json({ email: user.email });
  attachSessionCookie(response, token, expiresAt);
  return response;
}
