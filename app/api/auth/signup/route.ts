import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createUser, createEmailVerificationCode, findUserByEmail } from "@/lib/auth/queries";
import { hashPassword } from "@/lib/auth/passwords";
import { isValidEmail, passwordError } from "@/lib/auth/validate";
import { sendEmail } from "@/lib/email/resend";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/auth/rateLimit";

export const runtime = "nodejs";

interface SignupBody {
  email: string;
  password: string;
}

const WINDOW_MS = 60 * 60 * 1000;
const MAX_SIGNUPS_PER_IP = 5;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<SignupBody>;

  if (!checkRateLimit(`signup:ip:${getClientIp(request)}`, MAX_SIGNUPS_PER_IP, WINDOW_MS)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  if (!isValidEmail(body.email)) {
    return NextResponse.json({ error: "올바른 이메일을 입력해주세요." }, { status: 400 });
  }
  const pwError = passwordError(body.password);
  if (pwError) {
    return NextResponse.json({ error: pwError }, { status: 400 });
  }

  if (await findUserByEmail(body.email)) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }

  const passwordHash = await hashPassword(body.password as string);
  const user = await createUser(body.email, passwordHash);

  // No session cookie here -- the account isn't usable until the emailed
  // code is confirmed via /api/auth/verify-email (see that route, and
  // users.email_verified in lib/history/db.ts).
  const { code } = await createEmailVerificationCode(user.id);
  await sendEmail({
    to: user.email,
    subject: "AI Command Center 이메일 인증 코드",
    html: `
      <p>가입을 완료하려면 아래 6자리 코드를 입력해주세요. 10분 동안만 유효합니다.</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${code}</p>
      <p>요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다.</p>
    `,
  });

  return NextResponse.json({ email: user.email }, { status: 201 });
}
