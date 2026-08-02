import { NextResponse, type NextRequest } from "next/server";
import { requireUserContext } from "@/lib/auth/session";
import { getMaskedKeys } from "@/lib/config/keysStore";
import { queryOne } from "@/lib/history/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const startTime = Date.now();
  const userId = auth.id;

  // 1. DB ping & latency test
  let dbStatus: "ok" | "error" = "ok";
  let dbLatencyMs = 0;
  try {
    const dbStart = Date.now();
    await queryOne("SELECT 1 AS n", []);
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    dbStatus = "error";
  }

  // 2. Check AI Providers status
  const keysStatus = await getMaskedKeys(userId);
  const providersCheck = Object.entries(keysStatus.providers).map(([providerId, status]) => {
    return {
      provider: providerId,
      configured: status.configured,
      authType: status.authType,
      maskedKey: status.maskedKey,
      lastCallStatus: status.lastCallStatus,
      lastSuccessfulCallAt: status.lastSuccessfulCallAt,
    };
  });

  const totalDuration = Date.now() - startTime;

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    totalLatencyMs: totalDuration,
    diagnostics: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      providers: providersCheck,
      systemHealth: dbStatus === "ok" ? "healthy" : "degraded",
    },
  });
}
