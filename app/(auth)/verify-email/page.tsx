"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/auth/OtpInput";

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}

function VerifyEmailForm() {
  const router = useRouter();
  const email = useSearchParams().get("email");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  async function handleResend() {
    if (!email || resendCooldown > 0) return;
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("이메일 정보가 없습니다. 처음부터 다시 시도해주세요.");
      return;
    }
    if (code.length !== 6) {
      setError("6자리 코드를 모두 입력해주세요.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "인증하지 못했습니다.");
        return;
      }
      setDone(true);
      router.push("/app");
      router.refresh();
    } catch {
      setError("네트워크 오류로 인증하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">이메일 인증</h1>
        <p className="mt-2 text-sm text-text-secondary">
          {email ? (
            <>
              <span className="text-foreground">{email}</span>(으)로 보낸 6자리 코드를 입력하세요.
            </>
          ) : (
            "이메일 정보가 없습니다."
          )}
        </p>
      </div>

      <div className="glass w-full rounded-2xl p-8">
        {!email ? (
          <p className="text-center text-sm text-text-secondary">
            <Link href="/signup" className="text-foreground underline underline-offset-4">
              회원가입으로 돌아가기
            </Link>
          </p>
        ) : done ? (
          <p className="text-center text-sm text-foreground">인증이 완료되었습니다. 이동합니다...</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-center text-sm text-danger">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <OtpInput value={code} onChange={setCode} disabled={pending} autoFocus />
              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={resendCooldown > 0}
                className="w-full text-center text-xs text-text-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                {resendCooldown > 0 ? `코드 재전송 (${resendCooldown}초 후 가능)` : "코드를 못 받으셨나요? 재전송"}
              </button>
            </div>

            <Button type="submit" size="lg" className="w-full justify-center" disabled={pending || code.length !== 6}>
              인증 완료 <ArrowRight className="size-4" />
            </Button>
            <p className="text-center text-sm text-text-secondary">
              <Link href="/login" className="text-foreground underline underline-offset-4">
                로그인으로 돌아가기
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
