import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createPasswordResetCode, findUserByEmail } from "@/lib/auth/queries";
import { isValidEmail } from "@/lib/auth/validate";
import { sendEmail } from "@/lib/email/resend";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/auth/rateLimit";

export const runtime = "nodejs";

// Always the same response regardless of whether the account exists --
// otherwise this endpoint becomes an email-enumeration oracle.
const GENERIC_RESPONSE = { message: "등록된 이메일이면 인증 코드를 보냈습니다." };
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_IP = 5;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<{ email: string }>;

  if (!checkRateLimit(`forgot-password:ip:${getClientIp(request)}`, MAX_PER_IP, WINDOW_MS)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }
  if (!isValidEmail(body.email)) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const user = await findUserByEmail(body.email);
  if (user) {
    const { code } = await createPasswordResetCode(user.id);
    await sendEmail({
      to: user.email,
      subject: "AI Command Center 비밀번호 재설정 코드",
      html: `
        <p>비밀번호 재설정을 요청하셨습니다. 아래 6자리 코드는 10분 동안만 유효합니다.</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${code}</p>
        <p>요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다.</p>
      `,
    });
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
