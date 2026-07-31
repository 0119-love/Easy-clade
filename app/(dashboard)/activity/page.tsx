"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PROVIDER_IDS, PROVIDER_LABELS, type ProviderId } from "@/lib/config/types";
import type { RunRow, RunStatus } from "@/lib/history/queries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderMark } from "@/components/ui/provider-mark";
import { EFFORT_LABELS, HISTORY_STATUS_LABELS } from "@/lib/i18n/labels";

interface HistoryResponse {
  runs: RunRow[];
  total: number;
  today: { tokens: number; costUsd: number };
}

const PAGE_SIZE = 20;

async function fetchHistory(
  provider: ProviderId | "all",
  status: RunStatus | "all",
  offset: number,
): Promise<HistoryResponse> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (provider !== "all") params.set("provider", provider);
  if (status !== "all") params.set("status", status);
  const res = await fetch(`/api/history?${params.toString()}`);
  if (!res.ok) throw new Error("활동 내역을 불러오지 못했습니다.");
  return res.json();
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function ActivityPage() {
  const [provider, setProvider] = useState<ProviderId | "all">("all");
  const [status, setStatus] = useState<RunStatus | "all">("all");
  const [offset, setOffset] = useState(0);

  const { data, isPending } = useQuery({
    queryKey: ["history", provider, status, offset],
    queryFn: () => fetchHistory(provider, status, offset),
  });

  const runs = data?.runs ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-8 px-10 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">활동</h1>
        <div className="flex gap-2">
          <Select
            value={provider}
            onValueChange={(v) => {
              setProvider((v as ProviderId | "all") ?? "all");
              setOffset(0);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue>
                {(v: string) => (v === "all" ? "모든 프로바이더" : PROVIDER_LABELS[v as ProviderId])}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 프로바이더</SelectItem>
              {PROVIDER_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  {PROVIDER_LABELS[id]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus((v as RunStatus | "all") ?? "all");
              setOffset(0);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue>
                {(v: string) => (v === "all" ? "모든 상태" : HISTORY_STATUS_LABELS[v as RunStatus])}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="success">성공</SelectItem>
              <SelectItem value="error">오류</SelectItem>
              <SelectItem value="stopped">중지됨</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isPending ? (
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-border">
            {Array.from({ length: 6 }, (_, i) => (
              <tr key={i}>
                {Array.from({ length: 7 }, (_, j) => (
                  <td key={j} className="py-3 pr-4">
                    <Skeleton className="h-3 w-16" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : runs.length === 0 ? (
        <p className="text-sm text-text-secondary">기록된 실행이 없습니다.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-text-secondary">
            <tr>
              <th className="pb-3 pr-4 font-normal">시작 시각</th>
              <th className="pb-3 pr-4 font-normal">프로바이더</th>
              <th className="pb-3 pr-4 font-normal">모델</th>
              <th className="pb-3 pr-4 font-normal">모드</th>
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
                <td className="py-3 pr-4 text-xs text-text-secondary">
                  {run.effort ? EFFORT_LABELS[run.effort] : "—"}
                </td>
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

      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>총 {total}건</span>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            이전
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            다음
          </Button>
        </div>
      </div>
    </div>
  );
}
