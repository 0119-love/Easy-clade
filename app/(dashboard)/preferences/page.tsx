"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { exportAllData, fetchPreferences, resetAllDataRemote, savePreferencesRemote } from "@/lib/preferences/client";
import { PROVIDER_IDS, PROVIDER_LABELS, type Preferences, type ProviderId } from "@/lib/config/types";
import { ProviderMark } from "@/components/ui/provider-mark";

const EFFORT_LABELS: Record<Preferences["defaultEffort"], string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
  xhigh: "매우 높음",
  max: "최대",
};

function PreferencesForm({ initial, onSaved }: { initial: Preferences; onSaved: () => void }) {
  const [form, setForm] = useState<Preferences>(initial);
  const [saving, setSaving] = useState(false);

  function toggleProvider(id: ProviderId) {
    setForm((prev) => ({
      ...prev,
      activeProviders: prev.activeProviders.includes(id)
        ? prev.activeProviders.filter((p) => p !== id)
        : [...prev.activeProviders, id],
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await savePreferencesRemote(form);
      onSaved();
      toast.success("환경설정이 저장되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "환경설정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-1.5">
        <Label className="text-xs text-text-secondary">대시보드에 표시할 AI</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PROVIDER_IDS.map((id) => (
            <label
              key={id}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 transition-colors hover:bg-accent/40"
            >
              <span className="flex items-center gap-1.5 text-sm text-foreground">
                <ProviderMark provider={id} size="sm" />
                {PROVIDER_LABELS[id]}
              </span>
              <input
                type="checkbox"
                checked={form.activeProviders.includes(id)}
                onChange={() => toggleProvider(id)}
                className="size-4 accent-foreground"
              />
            </label>
          ))}
        </div>
        {form.activeProviders.length === 0 && (
          <p className="text-xs text-danger">최소 하나는 선택해야 합니다.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-text-secondary">기본 온도</Label>
          <Input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={form.defaultTemperature}
            onChange={(e) => setForm({ ...form, defaultTemperature: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-text-secondary">기본 생각 강도</Label>
          <Select
            value={form.defaultEffort}
            onValueChange={(v) => setForm({ ...form, defaultEffort: v as Preferences["defaultEffort"] })}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{(v: string) => EFFORT_LABELS[v as Preferences["defaultEffort"]]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(EFFORT_LABELS) as Preferences["defaultEffort"][]).map((key) => (
                <SelectItem key={key} value={key}>
                  {EFFORT_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <label className="flex items-center justify-between text-sm text-foreground">
        생각 과정 기본 표시
        <Switch
          checked={form.showThinkingByDefault}
          onCheckedChange={(checked) => setForm({ ...form, showThinkingByDefault: checked === true })}
        />
      </label>
      <label className="flex items-center justify-between text-sm text-foreground">
        응답 창 스크롤 동기화 (기본값)
        <Switch
          checked={form.syncScrollDefault}
          onCheckedChange={(checked) => setForm({ ...form, syncScrollDefault: checked === true })}
        />
      </label>

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={() => void handleSave()}
          disabled={saving || form.activeProviders.length === 0}
        >
          저장
        </Button>
      </div>
    </Card>
  );
}

export default function PreferencesPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["preferences"], queryFn: fetchPreferences });
  const [resetting, setResetting] = useState(false);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["preferences"] });
  }

  async function handleExport() {
    try {
      await exportAllData();
      toast.success("데이터를 내보냈습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "데이터를 내보내지 못했습니다.");
    }
  }

  async function handleReset() {
    const confirmed = window.confirm(
      "정말로 모든 로컬 데이터(API 키, 실행 기록, 작업, 메모리, 지식, 에이전트, 환경설정)를 삭제하시겠습니까? 되돌릴 수 없습니다.",
    );
    if (!confirmed) return;
    setResetting(true);
    try {
      await resetAllDataRemote();
      toast.success("모든 데이터가 초기화되었습니다.");
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "초기화에 실패했습니다.");
      setResetting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8 px-10 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">환경설정</h1>
        <p className="text-sm text-text-secondary">
          일반 앱 환경설정입니다. API 키와 일일 예산은 설정(API 키) 메뉴를 참고하세요.
        </p>
      </div>

      <Card className="flex items-center justify-between p-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">화면 테마</h2>
          <p className="mt-1 text-xs text-text-secondary">시스템을 선택하면 OS 설정을 따라갑니다.</p>
        </div>
        <ThemeToggle />
      </Card>

      {isPending || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <PreferencesForm initial={data} onSaved={refresh} />
      )}

      <Card className="space-y-3 p-6">
        <h2 className="text-sm font-semibold text-foreground">데이터</h2>
        <Button type="button" size="sm" variant="outline" onClick={() => void handleExport()}>
          데이터 내보내기 (JSON)
        </Button>
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="text-sm font-semibold text-danger">위험 구역</h2>
        <p className="text-xs text-text-secondary">
          API 키, 실행 기록, 작업, 메모리, 지식, 에이전트, 환경설정을 포함한 모든 로컬 데이터를 삭제합니다. 되돌릴 수
          없습니다.
        </p>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => void handleReset()}
          disabled={resetting}
        >
          모든 데이터 초기화
        </Button>
      </Card>
    </div>
  );
}
