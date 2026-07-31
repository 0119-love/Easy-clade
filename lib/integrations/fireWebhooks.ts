import { getEnabledIntegrationsForEvent, type IntegrationEventType } from "./queries";

/**
 * Outbound-only notification (e.g. a Slack Incoming Webhook URL the user
 * generates themselves) -- no OAuth, no inbound webhook receiver. Never
 * throws and never blocks the caller; a slow/unreachable endpoint must not
 * hold up a run's response.
 */
export async function fireWebhooks(userId: number, eventType: IntegrationEventType, payload: Record<string, unknown>): Promise<void> {
  const integrations = await getEnabledIntegrationsForEvent(userId, eventType);
  if (integrations.length === 0) return;

  await Promise.allSettled(
    integrations.map((integration) =>
      fetch(integration.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: eventType, ...payload }),
      }),
    ),
  );
}
