"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PROVIDER_LABELS } from "@/lib/config/types";
import type { RunRow } from "@/lib/history/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderMark } from "@/components/ui/provider-mark";
import { HISTORY_STATUS_LABELS } from "@/lib/i18n/labels";
import { fetchProject } from "@/lib/projects/client";

interface HistoryResponse {
  runs: RunRow[];
  total: number;
}

async function fetchProjectHistory(projectId: number): Promise<HistoryResponse> {
  const res = await fetch(`/api/history?projectId=${projectId}&limit=50`);
  if (!res.ok) throw new Error("실행 기록을 불러오지 못했습니다.");
  return res.json();
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);

  const { data: projectData, isPending: projectPending } = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => fetchProject(projectId),
  });
  const { data: historyData, isPending: historyPending } = useQuery({
    queryKey: ["history", "project", projectId],
    queryFn: () => fetchProjectHistory(projectId),
  });

  const runs = historyData?.runs ?? [];

  return (
    <div className="space-y-8 px-10 py-10">
      {projectPending ? (
        <Skeleton className="h-8 w-48" />
      ) : (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{projectData?.project.name}</h1>
          {projectData?.project.description && (
            <p className="text-sm text-text-secondary">{projectData.project.description}</p>
          )}
        </div>
      )}

      {historyPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <p className="text-sm text-text-secondary">이 프로젝트에 기록된 실행이 없습니다.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-text-secondary">
            <tr>
              <th className="pb-3 pr-4 font-normal">시작 시각</th>
              <th className="pb-3 pr-4 font-normal">프로바이더</th>
              <th className="pb-3 pr-4 font-normal">모델</th>
              <th className="pb-3 pr-4 font-normal">상태</th>
              <th className="pb-3 pr-4 font-normal">토큰</th>
              <th className="pb-3 font-normal">비용</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {runs.map((run) => (
              <tr key={run.id}>
                <td className="py-3 pr-4 text-xs text-text-secondary">{formatDateTime(run.startedAt)}</td>
                <td className="py-3 pr-4">
                  <span className="flex items-center gap-1.5">
                    <ProviderMark provider={run.provider} size="sm" />
                    {PROVIDER_LABELS[run.provider]}
                  </span>
                </td>
                <td className="py-3 pr-4 font-mono text-xs">{run.model}</td>
                <td className="py-3 pr-4">
                  <span
                    className={
                      run.status === "success"
                        ? "text-success"
                        : run.status === "error"
                          ? "text-danger"
                          : "text-text-secondary"
                    }
                  >
                    {HISTORY_STATUS_LABELS[run.status]}
                  </span>
                </td>
                <td className="py-3 pr-4 font-mono text-xs">{run.inputTokens + run.outputTokens}</td>
                <td className="py-3 font-mono text-xs">${run.costUsd.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
