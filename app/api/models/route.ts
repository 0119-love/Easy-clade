import { NextResponse } from "next/server";
import { getAllProviders } from "@/lib/providers/registry";
import type { ProviderId } from "@/lib/config/types";
import type { ModelInfo } from "@/lib/providers/types";

export const runtime = "nodejs";

export async function GET() {
  const providers = getAllProviders();
  const entries = await Promise.all(
    providers.map(async (provider) => [provider.id, await provider.listModels()] as [ProviderId, ModelInfo[]]),
  );
  const models = Object.fromEntries(entries) as Record<ProviderId, ModelInfo[]>;
  return NextResponse.json({ models });
}
