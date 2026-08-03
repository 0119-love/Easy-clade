"use client";

import { useMemo } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { ProviderToggleRow } from "./ProviderToggleRow";
import { useCommitteeStore } from "@/lib/store/committeeStore";
import { runCommittee } from "@/lib/committee/client";
import { estimateCommitteeRun } from "@/lib/committee/estimate";
import { formatDurationKo } from "@/lib/i18n/labels";
import { DEFAULT_MAX_LOOPS, MAX_MAX_LOOPS, MIN_MAX_LOOPS } from "@/lib/committee/defaults";
import type { KeysStatusResponse, ProviderId } from "@/lib/config/types";

const MISSION_MAX_LENGTH = 2000;

interface MissionComposerProps {
  keysStatus: KeysStatusResponse | undefined;
}

export function MissionComposer({ keysStatus }: MissionComposerProps) {
  const mission = useCommitteeStore((s) => s.mission);
  const context = useCommitteeStore((s) => s.context);
  const selectedProviders = useCommitteeStore((s) => s.selectedProviders);
  const targetQualityScore = useCommitteeStore((s) => s.targetQualityScore);
  const maxLoops = useCommitteeStore((s) => s.maxLoops);
  const runStatus = useCommitteeStore((s) => s.runStatus);
  const setMission = useCommitteeStore((s) => s.setMission);
  const setContext = useCommitteeStore((s) => s.setContext);
  const toggleProvider = useCommitteeStore((s) => s.toggleProvider);
  const setTargetQualityScore = useCommitteeStore((s) => s.setTargetQualityScore);
  const setMaxLoops = useCommitteeStore((s) => s.setMaxLoops);

  const running = runStatus === "running";
  // Same fix as app/api/consensus/route.ts's judge default: prefer a
  // selected provider that isn't already known to be failing (out of
  // credits/quota, etc.) over hardcoding Anthropic regardless of its actual
  // key status -- a judge call to a provider that just errored on its last
  // real call is a near-guaranteed second failure.
  const judgeProvider: ProviderId =
    selectedProviders.find((p) => keysStatus?.providers[p]?.lastCallStatus !== "error") ?? selectedProviders[0] ?? "anthropic";

  const estimate = useMemo(
    () => estimateCommitteeRun({ mission, context, providers: selectedProviders, maxLoops, judgeProvider }),
    [mission, context, selectedProviders, maxLoops, judgeProvider],
  );

  const canRun = !running && mission.trim().length > 0 && selectedProviders.length >= 2;

  function handleStart() {
    if (!canRun) return;
    void runCommittee({ mission: mission.trim(), context, providers: selectedProviders, targetQualityScore, maxLoops });
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-foreground">Mission</Label>
        <span className="text-xs text-text-secondary">
          {mission.length} / {MISSION_MAX_LENGTH}
        </span>
      </div>
      <Textarea
        value={mission}
        onChange={(e) => setMission(e.target.value.slice(0, MISSION_MAX_LENGTH))}
        placeholder="수행할 작업을 구체적으로 입력하세요..."
        className="min-h-24"
        disabled={running}
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input
          placeholder="타겟 사용자 (선택)"
          value={context.targetUsers}
          onChange={(e) => setContext({ targetUsers: e.target.value })}
          disabled={running}
        />
        <Input
          placeholder="스타일 (선택)"
          value={context.style}
          onChange={(e) => setContext({ style: e.target.value })}
          disabled={running}
        />
        <Input
          placeholder="기술 스택 (선택)"
          value={context.techStack}
          onChange={(e) => setContext({ techStack: e.target.value })}
          disabled={running}
        />
        <Input
          placeholder="특별 요구사항 (선택)"
          value={context.specialRequirements}
          onChange={(e) => setContext({ specialRequirements: e.target.value })}
          disabled={running}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-text-secondary">참여 프로바이더 (최소 2개)</Label>
        <ProviderToggleRow selected={selectedProviders} onToggle={toggleProvider} keysStatus={keysStatus} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>목표 품질 점수</span>
            <span className="font-mono">{targetQualityScore}</span>
          </div>
          <Slider
            value={[targetQualityScore]}
            onValueChange={(v) => setTargetQualityScore(Array.isArray(v) ? v[0] : v)}
            min={1}
            max={100}
            step={1}
            disabled={running}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="max-loops" className="text-xs text-text-secondary">
            최대 루프 횟수
          </Label>
          <Input
            id="max-loops"
            type="number"
            min={MIN_MAX_LOOPS}
            max={MAX_MAX_LOOPS}
            value={maxLoops}
            onChange={(e) =>
              setMaxLoops(Math.min(MAX_MAX_LOOPS, Math.max(MIN_MAX_LOOPS, Number(e.target.value) || DEFAULT_MAX_LOOPS)))
            }
            disabled={running}
          />
        </div>
      </div>

      {selectedProviders.length >= 2 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg bg-muted px-4 py-3 text-xs text-text-secondary">
          <span>
            최대 예상 비용 <span className="font-mono text-foreground">${estimate.estimatedMaxCostUsd.toFixed(3)}</span>
          </span>
          <span>
            최대 예상 시간 <span className="font-mono text-foreground">{formatDurationKo(estimate.estimatedMaxSeconds)}</span>
          </span>
          <span>
            총 호출 <span className="font-mono text-foreground">{estimate.totalCalls}회</span>
          </span>
        </div>
      )}

      {selectedProviders.length < 2 && (
        <p className="text-xs text-warning">프로바이더를 최소 2개 선택해야 서로 리뷰할 수 있습니다.</p>
      )}

      <Button type="button" size="lg" className="w-full" onClick={handleStart} disabled={!canRun}>
        <Play className="size-4" /> AI Committee 시작
      </Button>
    </Card>
  );
}
