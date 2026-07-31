"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always proceed to the code screen, whether or not the account exists --
      // the response never reveals that, so there's nothing to branch on here.
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">비밀번호를 잊으셨나요?</h1>
        <p className="mt-2 text-sm text-text-secondary">가입한 이메일을 입력하면 인증 코드를 보내드립니다.</p>
      </div>

      <div className="glass w-full rounded-2xl p-8">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm text-text-secondary" htmlFor="email">
              이메일
            </label>
            <InputGroup>
              <InputGroupAddon>
                <Mail className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="이메일을 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </InputGroup>
          </div>
          <Button type="submit" size="lg" className="w-full justify-center" disabled={pending}>
            인증 코드 보내기 <ArrowRight className="size-4" />
          </Button>
          <p className="text-center text-sm text-text-secondary">
            <Link href="/login" className="text-foreground underline underline-offset-4">
              로그인으로 돌아가기
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
