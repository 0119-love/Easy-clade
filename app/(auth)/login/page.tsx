"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

function nextPath(): string {
  if (typeof window === "undefined") return "/app";
  return new URLSearchParams(window.location.search).get("next") || "/app";
}

/** Sends the browser off to the provider's consent screen -- not a fetch, a real navigation. */
function startOAuth(provider: "google" | "github") {
  window.location.href = `/api/auth/${provider}/start?next=${encodeURIComponent(nextPath())}`;
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.4 0-13.8 4.2-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 35 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.9 39.6 16.4 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.8l6.6 5.6C41.5 36 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"password" | "key">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // A failed OAuth redirect lands back here with ?error=... -- once the user
  // acts again (submits a form, retries a provider), the fresh submitError
  // takes over instead.
  const error = submitError ?? searchParams.get("error");

  async function submit(url: string, body: unknown) {
    setSubmitError(null);
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
        setSubmitError(data.error ?? "로그인에 실패했습니다.");
        return;
      }
      router.push(nextPath());
      router.refresh();
    } catch {
      setSubmitError("네트워크 오류로 로그인하지 못했습니다.");
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

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full justify-center"
            onClick={() => startOAuth("google")}
          >
            <GoogleIcon />
            Google로 로그인
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full justify-center"
            onClick={() => startOAuth("github")}
          >
            <GithubIcon />
            GitHub로 로그인
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full justify-center"
            onClick={() => {
              setMode((m) => (m === "password" ? "key" : "password"));
              setSubmitError(null);
            }}
          >
            <KeyRound className="size-4" />
            {mode === "password" ? "API 키로 로그인" : "이메일/비밀번호로 로그인"}
          </Button>
        </div>

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
