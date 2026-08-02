"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Sparkles, LayoutGrid, Radio, Network, CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrainStatusBar } from "@/components/dashboard/BrainStatusBar";
import { BrainPulseView } from "@/components/dashboard/BrainPulseView";
import { BrainGraphView } from "@/components/dashboard/BrainGraphView";
import { BrainSidePanel } from "@/components/dashboard/BrainSidePanel";
import { BrainSubsystemsHub } from "@/components/dashboard/BrainSubsystemsHub";
import { BrainQuickTester } from "@/components/dashboard/BrainQuickTester";
import { fetchBrainGraph, fetchBrainStatus } from "@/lib/brain/client";

export default function BrainPage() {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<{
    dbLatency: number;
    providers: { provider: string; configured: boolean }[];
  } | null>(null);

  const { data: status, isPending: statusPending, refetch: refetchStatus } = useQuery({
    queryKey: ["brain", "status", isDemoMode],
    queryFn: () => fetchBrainStatus(isDemoMode),
    refetchInterval: 4000,
  });

  const { data: graph, isPending: graphPending } = useQuery({
    queryKey: ["brain", "graph"],
    queryFn: fetchBrainGraph,
    refetchInterval: 20000,
  });

  const handleRunDiagnostics = async () => {
    setIsDiagnosing(true);
    try {
      const res = await fetch("/api/brain/ping", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setDiagResult({
          dbLatency: data.diagnostics.database.latencyMs,
          providers: data.diagnostics.providers,
        });
        toast.success(`AI 진단 완료! DB 지연시간: ${data.diagnostics.database.latencyMs}ms`);
      } else {
        toast.error("시스템 진단 중 오류가 발생했습니다.");
      }
    } catch {
      toast.error("진단 서버 연결 실패");
    } finally {
      setIsDiagnosing(false);
    }
  };

  return (
    <div className="space-y-5 px-6 py-6 max-w-[1600px] mx-auto">
      {/* Header & Quick Action Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">브레인</h1>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
              AI Nerve Center
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-text-secondary">
            AI 서브시스템 실시간 모니터링, 시스템 쾌속 진단 및 종합 신경망 지휘소입니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Demo Data Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !isDemoMode;
              setIsDemoMode(next);
              toast.info(next ? "데모 시뮬레이션 모드가 활성화되었습니다." : "실시간 백엔드 데이터 모드로 전환되었습니다.");
            }}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
              isDemoMode
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-sm"
                : "border-border/60 bg-secondary/50 text-text-secondary hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Sparkles className="size-3.5 text-amber-400" />
            {isDemoMode ? "데모 시뮬레이션 중" : "데모 모드 켜기"}
          </button>

          {/* 1-Click Diagnostics Button */}
          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={isDiagnosing}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
          >
            {isDiagnosing ? <Loader2 className="size-3.5 animate-spin" /> : <Activity className="size-3.5" />}
            {isDiagnosing ? "진단 진행 중..." : "AI 시스템 쾌속 진단"}
          </button>
        </div>
      </div>

      {/* Diagnostic Result Banner (if run) */}
      {diagResult && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-emerald-300">AI 시스템 진단 완료:</span> DB 응답 속도{" "}
              <span className="font-semibold text-white">{diagResult.dbLatency}ms</span> · 등록된 프로바이더{" "}
              <span className="font-semibold text-white">
                {diagResult.providers.filter((p) => p.configured).length}개 활성
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDiagResult(null)}
            className="text-[11px] text-emerald-400 underline hover:text-emerald-200"
          >
            닫기
          </button>
        </div>
      )}

      {/* Key Status Bar */}
      <BrainStatusBar kpis={status?.kpis} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="hub" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="bg-[#111114] border border-[#26262b] p-1">
            <TabsTrigger value="hub" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <LayoutGrid className="size-3.5" />
              지휘소 Hub
            </TabsTrigger>
            <TabsTrigger value="pulse" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Radio className="size-3.5" />
              실시간 펄스 맵
            </TabsTrigger>
            <TabsTrigger value="graph" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Network className="size-3.5" />
              아키텍처 그래프
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Subsystems Control Hub */}
        <TabsContent value="hub" className="space-y-4 focus-visible:outline-none">
          <BrainSubsystemsHub regions={status?.regions} />
          
          <div className="mt-6">
            <BrainQuickTester />
          </div>
        </TabsContent>

        {/* Tab 2: 2D Pulse Orbit Canvas + Live Quick Tester */}
        <TabsContent value="pulse" className="space-y-4 focus-visible:outline-none">
          <div className="flex items-start gap-4 flex-col lg:flex-row">
            <div className="min-w-0 flex-1 w-full space-y-4">
              <BrainPulseView status={status} isLoading={statusPending} />
              <BrainQuickTester />
            </div>
            <BrainSidePanel status={status} isLoading={statusPending} />
          </div>
        </TabsContent>

        {/* Tab 3: Graph View */}
        <TabsContent value="graph" className="space-y-4 focus-visible:outline-none">
          <div className="flex items-start gap-4 flex-col lg:flex-row">
            <div className="min-w-0 flex-1 w-full">
              <BrainGraphView graph={graph} isLoading={graphPending} />
            </div>
            <BrainSidePanel status={status} isLoading={statusPending} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
