"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createIntegration,
  deleteIntegrationRemote,
  fetchIntegrations,
  setIntegrationEnabledRemote,
  type IntegrationEventType,
} from "@/lib/integrations/client";

const EVENT_LABELS: Record<IntegrationEventType, string> = {
  run_complete: "모델 실행 완료 시",
  consensus_complete: "합의/최선의 답변 완료 시",
};

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["integrations"], queryFn: fetchIntegrations });

  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [eventType, setEventType] = useState<IntegrationEventType>("run_complete");
  const [saving, setSaving] = useState(false);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["integrations"] });
  }

  async function handleCreate() {
    if (!name.trim() || !webhookUrl.trim()) return;
    setSaving(true);
    try {
      await createIntegration(name.trim(), webhookUrl.trim(), eventType);
      setName("");
      setWebhookUrl("");
      refresh();
      toast.success("연동이 추가되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "연동을 추가하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: number, enabled: boolean) {
    try {
      await setIntegrationEnabledRemote(id, !enabled);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "연동 상태를 변경하지 못했습니다.");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteIntegrationRemote(id);
      refresh();
      toast.success("연동이 삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "연동을 삭제하지 못했습니다.");
    }
  }

  const integrations = data?.integrations ?? [];

  return (
    <div className="max-w-2xl space-y-8 px-10 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">연동</h1>
        <p className="text-sm text-text-secondary">
          Slack Incoming Webhook 등 직접 발급받은 웹훅 URL로 실행 완료 알림을 보냅니다. OAuth 연동이나 수신용
          웹훅은 지원하지 않는 단방향(발신 전용) 알림입니다.
        </p>
      </div>

      <Card className="space-y-3 p-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="연동 이름 (예: Slack 알림)" />
        <Input
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="웹훅 URL (https://...)"
        />
        <Select value={eventType} onValueChange={(v) => setEventType(v as IntegrationEventType)}>
          <SelectTrigger className="w-full">
            <SelectValue>{(v: string) => EVENT_LABELS[v as IntegrationEventType]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="run_complete">{EVENT_LABELS.run_complete}</SelectItem>
            <SelectItem value="consensus_complete">{EVENT_LABELS.consensus_complete}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={() => void handleCreate()}
            disabled={saving || !name.trim() || !webhookUrl.trim()}
          >
            추가
          </Button>
        </div>
      </Card>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : integrations.length === 0 ? (
        <p className="text-sm text-text-secondary">아직 등록된 연동이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {integrations.map((integration) => (
            <Card key={integration.id} className="flex items-center gap-3 p-4">
              <div className="flex-1 space-y-0.5">
                <div className="text-sm font-medium text-foreground">{integration.name}</div>
                <div className="truncate text-xs text-text-secondary">
                  {EVENT_LABELS[integration.eventType]} · {integration.webhookUrl}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleToggle(integration.id, integration.enabled)}
                className={integration.enabled ? "text-xs text-success" : "text-xs text-text-secondary"}
              >
                {integration.enabled ? "활성" : "비활성"}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(integration.id)}
                className="text-text-secondary hover:text-danger"
              >
                <Trash2 className="size-3.5" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
