import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/providers/registry";
import { insertRun } from "@/lib/history/queries";
import { formatProviderError } from "@/lib/providers/errorMessage";
import { getPinnedMemoryEntries } from "@/lib/memory/queries";
import { getFile } from "@/lib/files/queries";
import { fireWebhooks } from "@/lib/integrations/fireWebhooks";
import { recordCallResult, sanitizeErrorMessage } from "@/lib/config/keysStore";
import { requireUserContext } from "@/lib/auth/session";
import type { ProviderId } from "@/lib/config/types";
import type { Attachment } from "@/lib/providers/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

interface RunRequestBody {
  provider: ProviderId;
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  runGroupId: string;
  projectId?: number | null;
  attachmentFileIds?: number[];
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as RunRequestBody;
  const provider = getProvider(body.provider);

  const pinnedMemory = await getPinnedMemoryEntries(auth.id);
  const memoryPrefix =
    pinnedMemory.length > 0 ? `[기억된 정보]\n${pinnedMemory.map((m) => `- ${m.content}`).join("\n")}\n\n` : "";
  const systemPrompt = `${memoryPrefix}${body.systemPrompt ?? ""}` || undefined;

  // Only images are sent to models -- other file types stay list/download-only (see Files page).
  // file.path is a Vercel Blob URL (see lib/history/db.ts's comment on that column) -- fetched
  // over HTTP rather than read off local disk.
  const candidateFiles = await Promise.all((body.attachmentFileIds ?? []).map((id) => getFile(auth.id, id)));
  const attachments: Attachment[] = await Promise.all(
    candidateFiles
      .filter((f): f is NonNullable<typeof f> => f !== null && SUPPORTED_IMAGE_MIME_TYPES.has(f.mimeType))
      .map(async (f) => ({
        mimeType: f.mimeType as Attachment["mimeType"],
        data: Buffer.from(await (await fetch(f.path)).arrayBuffer()).toString("base64"),
      })),
  );

  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let status: "success" | "error" | "stopped" = "success";
      let responseText = "";
      let errorMessage: string | null = null;
      let inputTokens = 0;
      let outputTokens = 0;
      let costUsd = 0;

      function send(chunk: unknown) {
        controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`));
      }

      try {
        for await (const chunk of provider.streamComplete(
          auth.id,
          {
            model: body.model,
            systemPrompt,
            userPrompt: body.userPrompt,
            temperature: body.temperature,
            maxTokens: body.maxTokens,
            effort: body.effort,
            attachments,
          },
          request.signal,
        )) {
          if (chunk.type === "text-delta") responseText += chunk.text;
          if (chunk.type === "done") {
            inputTokens = chunk.inputTokens;
            outputTokens = chunk.outputTokens;
            costUsd = chunk.costUsd;
          }
          if (chunk.type === "error") {
            status = "error";
            errorMessage = chunk.message;
          }
          send(chunk);
        }
      } catch (err) {
        if (!request.signal.aborted) {
          status = "error";
          errorMessage = formatProviderError(err, "알 수 없는 오류");
          send({ type: "error", message: errorMessage });
        }
      }

      if (request.signal.aborted) status = "stopped";

      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      const runId = await insertRun(auth.id, {
        runGroupId: body.runGroupId,
        provider: body.provider,
        model: body.model,
        systemPrompt: systemPrompt ?? null,
        userPrompt: body.userPrompt,
        temperature: body.temperature ?? null,
        status,
        responseText: responseText || null,
        errorMessage,
        inputTokens,
        outputTokens,
        costUsd,
        latencyMs: null,
        durationMs,
        startedAt,
        completedAt,
        projectId: body.projectId ?? null,
        effort: body.effort ?? null,
      });
      send({ type: "persisted", runId });

      if (status === "success") {
        await recordCallResult(auth.id, body.provider, "success");
      } else if (status === "error" && errorMessage) {
        await recordCallResult(auth.id, body.provider, "error", await sanitizeErrorMessage(auth.id, errorMessage, body.provider));
      }

      void fireWebhooks(auth.id, "run_complete", {
        provider: body.provider,
        model: body.model,
        status,
        userPrompt: body.userPrompt,
        responseText: responseText || null,
        errorMessage,
      });

      controller.close();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}
