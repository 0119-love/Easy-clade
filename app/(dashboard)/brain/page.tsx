"use client";

import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrainStatusBar } from "@/components/dashboard/BrainStatusBar";
import { BrainPulseView } from "@/components/dashboard/BrainPulseView";
import { BrainGraphView } from "@/components/dashboard/BrainGraphView";
import { BrainSidePanel } from "@/components/dashboard/BrainSidePanel";
import { fetchBrainGraph, fetchBrainStatus } from "@/lib/brain/client";

export default function BrainPage() {
  const { data: status, isPending: statusPending } = useQuery({
    queryKey: ["brain", "status"],
    queryFn: fetchBrainStatus,
    refetchInterval: 4000,
  });
  const { data: graph, isPending: graphPending } = useQuery({
    queryKey: ["brain", "graph"],
    queryFn: fetchBrainGraph,
    refetchInterval: 20000,
  });

  return (
    <div className="space-y-4 px-6 py-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">브레인</h1>
        <p className="text-sm text-text-secondary">이 계정에서 실제로 실행 중인 AI 서브시스템의 실시간 운영 현황입니다.</p>
      </div>

      <BrainStatusBar kpis={status?.kpis} />

      <Tabs defaultValue="pulse">
        <TabsList>
          <TabsTrigger value="pulse">펄스</TabsTrigger>
          <TabsTrigger value="graph">그래프</TabsTrigger>
        </TabsList>

        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <TabsContent value="pulse">
              <BrainPulseView status={status} isLoading={statusPending} />
            </TabsContent>
            <TabsContent value="graph">
              <BrainGraphView graph={graph} isLoading={graphPending} />
            </TabsContent>
          </div>
          <BrainSidePanel status={status} isLoading={statusPending} />
        </div>
      </Tabs>
    </div>
  );
}
