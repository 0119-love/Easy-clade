"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

function nextPath(): string {
  if (typeof window === "undefined") return "/app";
  return new URLSearchParams(window.location.search).get("next") || "/app";
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "key">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(url: string, body: unknown) {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; needsVerification?: boolean; email?: string };
      if (!res.ok) {
        if (data.needsVerification && data.email) {
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
          return;
        }
        setError(data.error ?? "로그인에 실패했습니다.");
        return;
      }
      router.push(nextPath());
      router.refresh();
    } catch {
      setError("네트워크 오류로 로그인하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    void submit("/api/auth/login", { email, password, remember });
  }

  function handleKeySubmit(e: FormEvent) {
    e.preventDefault();
    void submit("/api/auth/login-with-key", { apiKey });
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">AI Command Center에 오신 것을 환영합니다</h1>
        <p className="mt-2 text-sm text-text-secondary">로그인하여 AI 모델과 설정을 관리하세요.</p>
      </div>

      <div className="glass w-full rounded-2xl p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.08] text-lg font-semibold text-foreground">
            A
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">로그인</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {mode === "password" ? "계정에 로그인하여 계속하세요" : "Claude API 키로 빠르게 로그인하세요"}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        {mode === "password" ? (
          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
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
                  autoComplete="current-password"
                  required
                  placeholder="비밀번호를 입력하세요"
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
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-text-secondary">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
                로그인 상태 유지
              </label>
              <Link href="/forgot-password" className="text-text-secondary hover:text-foreground">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
            <Button type="submit" size="lg" className="w-full justify-center" disabled={pending}>
              로그인 <ArrowRight className="size-4" />
            </Button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleKeySubmit}>
            <div className="space-y-1.5">
              <label className="text-sm text-text-secondary" htmlFor="apiKey">
                Claude API 키
              </label>
              <InputGroup>
                <InputGroupAddon>
                  <KeyRound className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  id="apiKey"
                  type="password"
                  required
                  placeholder="sk-ant-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </InputGroup>
              <p className="text-xs text-text-secondary">
                설정에서 이미 등록한 Anthropic API 키를 입력하면 바로 로그인됩니다.
              </p>
            </div>
            <Button type="submit" size="lg" className="w-full justify-center" disabled={pending}>
              API 키로 로그인 <ArrowRight className="size-4" />
            </Button>
          </form>
        )}

        <div className="my-6 flex items-center gap-3 text-xs text-text-secondary">
          <div className="h-px flex-1 bg-border" /> 또는 <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full justify-center"
          onClick={() => {
            setMode((m) => (m === "password" ? "key" : "password"));
            setError(null);
          }}
        >
          <KeyRound className="size-4" />
          {mode === "password" ? "API 키로 로그인" : "이메일/비밀번호로 로그인"}
        </Button>

        <p className="mt-6 text-center text-sm text-text-secondary">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-foreground underline underline-offset-4">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
