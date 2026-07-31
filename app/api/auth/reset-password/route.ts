import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  deleteAllSessionsForUser,
  findUserByEmail,
  updateUserPassword,
  verifyAndConsumePasswordResetCode,
} from "@/lib/auth/queries";
import { hashPassword } from "@/lib/auth/passwords";
import { isValidEmail, passwordError } from "@/lib/auth/validate";

export const runtime = "nodejs";

const CODE_ERRORS: Record<string, string> = {
  invalid: "코드가 올바르지 않습니다.",
  expired: "코드가 만료되었습니다. 다시 요청해주세요.",
  too_many_attempts: "시도 횟수를 초과했습니다. 코드를 다시 요청해주세요.",
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<{ email: string; code: string; password: string }>;

  if (!isValidEmail(body.email) || typeof body.code !== "string" || !/^\d{6}$/.test(body.code)) {
    return NextResponse.json({ error: "코드가 올바르지 않습니다." }, { status: 400 });
  }
  const pwError = passwordError(body.password);
  if (pwError) {
    return NextResponse.json({ error: pwError }, { status: 400 });
  }

  const user = await findUserByEmail(body.email);
  // A nonexistent account can never have a live code, so this naturally
  // collapses into the same "invalid" response -- no separate branch needed.
  const result = user ? await verifyAndConsumePasswordResetCode(user.id, body.code) : "invalid";
  if (result !== "ok" || !user) {
    return NextResponse.json({ error: CODE_ERRORS[result] ?? "코드가 올바르지 않습니다." }, { status: 400 });
  }

  const passwordHash = await hashPassword(body.password as string);
  await updateUserPassword(user.id, passwordHash);
  // A password reset is a good moment to boot every other logged-in device too.
  await deleteAllSessionsForUser(user.id);

  return NextResponse.json({ ok: true });
}
