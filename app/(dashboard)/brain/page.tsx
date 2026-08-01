"use client";

import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrainPulseView } from "@/components/dashboard/BrainPulseView";
import { BrainGraphView } from "@/components/dashboard/BrainGraphView";
import { fetchBrainGraph, fetchBrainSnapshot } from "@/lib/brain/client";

export default function BrainPage() {
  const { data: snapshot, isPending: snapshotPending } = useQuery({
    queryKey: ["brain", "snapshot"],
    queryFn: fetchBrainSnapshot,
    refetchInterval: 4000,
  });
  const { data: graph, isPending: graphPending } = useQuery({
    queryKey: ["brain", "graph"],
    queryFn: fetchBrainGraph,
    refetchInterval: 20000,
  });

  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <h1 className="text-[32px] font-bold tracking-tight text-foreground">브레인</h1>
        <p className="text-sm text-text-secondary">
          Committee, Automations, Memory 등 실제 서브시스템의 활동과 연결 관계를 실시간으로 시각화합니다.
        </p>
      </div>

      <Tabs defaultValue="pulse">
        <TabsList>
          <TabsTrigger value="pulse">펄스</TabsTrigger>
          <TabsTrigger value="graph">그래프</TabsTrigger>
        </TabsList>
        <TabsContent value="pulse">
          <BrainPulseView regions={snapshot?.regions} isLoading={snapshotPending} />
        </TabsContent>
        <TabsContent value="graph">
          <BrainGraphView graph={graph} isLoading={graphPending} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
