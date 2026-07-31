import type { IntegrationEventType, IntegrationRow } from "@/lib/integrations/queries";

export type { IntegrationEventType, IntegrationRow };

export async function fetchIntegrations(): Promise<{ integrations: IntegrationRow[] }> {
  const res = await fetch("/api/integrations");
  if (!res.ok) throw new Error("연동 목록을 불러오지 못했습니다.");
  return res.json();
}

export async function createIntegration(
  name: string,
  webhookUrl: string,
  eventType: IntegrationEventType,
): Promise<void> {
  const res = await fetch("/api/integrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, webhookUrl, eventType }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "연동을 추가하지 못했습니다.");
  }
}

export async function setIntegrationEnabledRemote(id: number, enabled: boolean): Promise<void> {
  const res = await fetch(`/api/integrations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error("연동 상태를 변경하지 못했습니다.");
}

export async function deleteIntegrationRemote(id: number): Promise<void> {
  const res = await fetch(`/api/integrations/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("연동을 삭제하지 못했습니다.");
}
