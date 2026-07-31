"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "회원가입에 실패했습니다.");
        return;
      }
      // Account exists but isn't usable yet -- see app/api/auth/signup, which
      // now emails a verification code instead of attaching a session cookie.
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError("네트워크 오류로 회원가입하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">AI Command Center 계정 만들기</h1>
        <p className="mt-2 text-sm text-text-secondary">가입하고 나만의 API 키와 설정을 관리하세요.</p>
      </div>

      <div className="glass w-full rounded-2xl p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.08] text-lg font-semibold text-foreground">
            A
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">회원가입</h2>
            <p className="mt-1 text-sm text-text-secondary">이메일과 비밀번호로 계정을 만드세요</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

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
          <div className="space-y-1.5">
            <label className="text-sm text-text-secondary" htmlFor="password">
              비밀번호
            </label>
            <InputGroup>
              <InputGroupAddon>
                <Lock className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                placeholder="8자 이상 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton type="button" size="icon-xs" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-text-secondary" htmlFor="confirmPassword">
              비밀번호 확인
            </label>
            <InputGroup>
              <InputGroupAddon>
                <Lock className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                placeholder="비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </InputGroup>
          </div>
          <Button type="submit" size="lg" className="w-full justify-center" disabled={pending}>
            회원가입 <ArrowRight className="size-4" />
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
