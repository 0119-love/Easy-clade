"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ProviderMark } from "@/components/ui/provider-mark";
import {
  PROVIDER_IDS,
  PROVIDER_KEY_URLS,
  PROVIDER_LABELS,
  type KeysStatusResponse,
  type ProviderId,
} from "@/lib/config/types";
import { PROVIDER_SETUP_STEPS } from "@/lib/config/providerSetupGuides";
import { extractApiKey } from "@/lib/config/keyPatterns";
import { fetchCurrentUser, updateDisplayName } from "@/lib/auth/client";

async function fetchKeysStatus(): Promise<KeysStatusResponse> {
  const res = await fetch("/api/settings/keys");
  if (!res.ok) throw new Error("키 상태를 불러오지 못했습니다.");
  return res.json();
}

interface ProviderKeyRowProps {
  provider: ProviderId;
  status: KeysStatusResponse["providers"][ProviderId] | undefined;
  tokenLimit: number | undefined;
  onSaved: () => void;
  isLoading: boolean;
}

function ProviderKeyRow({ provider, status, tokenLimit, onSaved, isLoading }: ProviderKeyRowProps) {
  const [value, setValue] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [limitInput, setLimitInput] = useState(tokenLimit?.toString() ?? "");
  const [savingLimit, setSavingLimit] = useState(false);
  const didInitLimit = useRef(false);

  useEffect(() => {
    if (!didInitLimit.current && tokenLimit !== undefined) {
      setLimitInput(tokenLimit.toString());
      didInitLimit.current = true;
    }
  }, [tokenLimit]);

  async function saveLimit() {
    setSavingLimit(true);
    try {
      const res = await fetch("/api/settings/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, tokenLimit: limitInput.trim() ? Number(limitInput) : null }),
      });
      if (!res.ok) throw new Error("저장에 실패했습니다.");
      onSaved();
      toast.success(`${PROVIDER_LABELS[provider]} 일일 토큰 한도가 저장되었습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSavingLimit(false);
    }
  }

  async function save() {
    if (!value.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: value.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "저장에 실패했습니다.");
      }
      setValue("");
      setTestResult(null);
      onSaved();
      toast.success(`${PROVIDER_LABELS[provider]} 키가 저장되었습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    await fetch("/api/settings/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, clear: true }),
    });
    setTestResult(null);
    onSaved();
    toast.success(`${PROVIDER_LABELS[provider]} 키가 삭제되었습니다.`);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text");
    if (!pasted) return;
    e.preventDefault();
    setValue(extractApiKey(provider, pasted));
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = (await res.json()) as { success: boolean; message?: string };
      setTestResult(data);
      onSaved();
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : "알 수 없는 오류" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card className="space-y-3 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ProviderMark provider={provider} size="sm" />
          <h2 className="text-sm font-semibold text-foreground">{PROVIDER_LABELS[provider]}</h2>
          <a
            href={PROVIDER_KEY_URLS[provider]}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-foreground"
          >
            키 발급받기 <ExternalLink className="size-3" />
          </a>
        </div>
        {isLoading ? (
          <Skeleton className="h-3 w-20" />
        ) : (
          <span className="font-mono text-xs text-text-secondary">
            {status?.configured ? status.maskedKey : "미등록"}
          </span>
        )}
      </div>
      {!status?.configured && status?.authType !== "oauth" && (
        <Accordion>
          <AccordionItem value={provider} className="border-none">
            <AccordionTrigger className="w-fit py-0 text-xs text-text-secondary hover:no-underline">
              발급 방법 보기
            </AccordionTrigger>
            <AccordionContent>
              <ol className="list-inside list-decimal space-y-1 pt-2 text-xs text-text-secondary">
                {PROVIDER_SETUP_STEPS[provider].map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      {status?.authType === "oauth" ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-accent/40 px-3 py-2">
          <span className="text-xs text-text-secondary">
            Chrome 확장 프로그램으로 Claude 구독 계정에 연결되어 있습니다.
          </span>
          <Button type="button" size="sm" variant="outline" onClick={clear}>
            연결 해제
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder={status?.configured ? "키 교체..." : "API 키 붙여넣기 (페이지 전체를 복사해도 자동 인식)..."}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPaste={handlePaste}
          />
          <Button type="button" size="sm" onClick={save} disabled={saving || !value.trim()}>
            저장
          </Button>
          {status?.configured && (
            <Button type="button" size="sm" variant="outline" onClick={clear}>
              삭제
            </Button>
          )}
        </div>
      )}
      {provider === "anthropic" && status?.authType !== "oauth" && (
        <p className="text-xs text-text-secondary">
          또는 AI Command Center Connect 확장 프로그램의 <span className="font-medium">Connect</span> 버튼으로 Claude
          구독 계정을 바로 연결할 수 있습니다 (별도 설치 필요).
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={testConnection}
          disabled={testing || !status?.configured}
        >
          {testing ? "테스트 중..." : "연결 테스트"}
        </Button>
        {testResult && (
          <span className={testResult.success ? "text-xs text-success" : "text-xs text-danger"}>
            {testResult.success ? "연결됨" : testResult.message}
          </span>
        )}
      </div>
      <div className="flex items-end gap-2 border-t border-border/60 pt-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor={`limit-${provider}`} className="text-xs text-text-secondary">
            일일 토큰 한도
          </Label>
          <Input
            id={`limit-${provider}`}
            type="number"
            min={0}
            value={limitInput}
            onChange={(e) => setLimitInput(e.target.value)}
            placeholder="비워두면 한도 없음"
          />
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={saveLimit} disabled={savingLimit}>
          저장
        </Button>
      </div>
    </Card>
  );
}

function ProfileCard() {
  const queryClient = useQueryClient();
  const { data: me, isPending } = useQuery({ queryKey: ["auth", "me"], queryFn: fetchCurrentUser });
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const didInitName = useRef(false);

  useEffect(() => {
    if (me && !didInitName.current) {
      setName(me.displayName ?? "");
      didInitName.current = true;
    }
  }, [me]);

  async function save() {
    setSaving(true);
    try {
      await updateDisplayName(name.trim());
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("프로필이 저장되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3 p-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">프로필</h2>
        <p className="text-xs text-text-secondary">
          대시보드 인사말 등에 표시되는 이름입니다. 비워두면 이메일 아이디로 표시됩니다.
        </p>
      </div>
      <div className="flex gap-2">
        {isPending ? (
          <Skeleton className="h-9 flex-1" />
        ) : (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={me?.email ? me.email.split("@")[0] : "표시 이름"}
            maxLength={60}
          />
        )}
        <Button type="button" size="sm" onClick={save} disabled={saving || isPending}>
          저장
        </Button>
      </div>
      <p className="text-xs text-text-secondary">이메일: {me?.email ?? "..."}</p>
    </Card>
  );
}

interface DailyBudgetFormProps {
  dailyBudget: KeysStatusResponse["dailyBudget"] | undefined;
  onSaved: () => void;
}

function DailyBudgetForm({ dailyBudget, onSaved }: DailyBudgetFormProps) {
  const [tokens, setTokens] = useState(dailyBudget?.tokens?.toString() ?? "");
  const [costUsd, setCostUsd] = useState(dailyBudget?.costUsd?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/settings/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyBudget: {
            tokens: tokens.trim() ? Number(tokens) : null,
            costUsd: costUsd.trim() ? Number(costUsd) : null,
          },
        }),
      });
      onSaved();
      toast.success("일일 예산이 저장되었습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3 p-6">
      <h2 className="text-sm font-semibold text-foreground">일일 예산</h2>
      <p className="text-xs text-text-secondary">
        선택 사항입니다. 설정하면 시스템 개요에 이 한도 대비 진행률이 표시됩니다. 비워두면 임의의 한도 없이 실제
        숫자만 표시됩니다.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="budget-tokens" className="text-xs text-text-secondary">
            일일 토큰 예산
          </Label>
          <Input
            id="budget-tokens"
            type="number"
            min={0}
            value={tokens}
            onChange={(e) => setTokens(e.target.value)}
            placeholder="예: 10000000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="budget-cost" className="text-xs text-text-secondary">
            일일 비용 예산 ($)
          </Label>
          <Input
            id="budget-cost"
            type="number"
            min={0}
            step="0.01"
            value={costUsd}
            onChange={(e) => setCostUsd(e.target.value)}
            placeholder="예: 25"
          />
        </div>
      </div>
      <Button type="button" size="sm" onClick={save} disabled={saving}>
        예산 저장
      </Button>
    </Card>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: keysStatus, isPending } = useQuery({ queryKey: ["settings", "keys"], queryFn: fetchKeysStatus });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["settings", "keys"] });
  }

  return (
    <div className="max-w-2xl space-y-8 px-10 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">설정</h1>
      </div>

      <div className="space-y-4">
        <ProfileCard />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">API 키</h2>
          <p className="text-sm text-text-secondary">
            암호화되어 서버 데이터베이스에 저장됩니다. 각 프로바이더로 보내는 것 외에는 어디로도 전송되지 않습니다.
          </p>
        </div>
        {PROVIDER_IDS.map((provider) => (
          <ProviderKeyRow
            key={provider}
            provider={provider}
            status={keysStatus?.providers[provider]}
            tokenLimit={keysStatus?.providerTokenLimits[provider]}
            onSaved={refresh}
            isLoading={isPending}
          />
        ))}
      </div>

      <DailyBudgetForm dailyBudget={keysStatus?.dailyBudget} onSaved={refresh} />
    </div>
  );
}
