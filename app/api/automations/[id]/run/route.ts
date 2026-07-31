import { NextResponse, type NextRequest } from "next/server";
import { getAutomation, updateAutomationLastRun } from "@/lib/automations/queries";
import { extractCodeFile, mimeTypeForExtension, resolveFilename } from "@/lib/automations/codeExtract";
import { getProvider } from "@/lib/providers/registry";
import { insertRun } from "@/lib/history/queries";
import { insertFile, type FileRow } from "@/lib/files/queries";
import { storeFile } from "@/lib/files/blobStorage";
import { recordCallResult, sanitizeErrorMessage } from "@/lib/config/keysStore";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const automation = await getAutomation(auth.id, Number(id));
  if (!automation) {
    return NextResponse.json({ error: "자동화를 찾을 수 없습니다." }, { status: 404 });
  }

  const provider = getProvider(automation.provider);
  const controller = new AbortController();
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  let responseText = "";
  let status: "success" | "error" = "success";
  let errorMessage: string | null = null;
  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;

  try {
    for await (const chunk of provider.streamComplete(
      auth.id,
      { model: automation.model, userPrompt: automation.promptTemplate },
      controller.signal,
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
    }
  } catch (err) {
    status = "error";
    errorMessage = err instanceof Error ? err.message : "알 수 없는 오류";
  }

  const completedAt = new Date().toISOString();

  const runId = await insertRun(auth.id, {
    runGroupId: crypto.randomUUID(),
    provider: automation.provider,
    model: automation.model,
    systemPrompt: null,
    userPrompt: automation.promptTemplate,
    temperature: null,
    status,
    responseText: responseText || null,
    errorMessage,
    inputTokens,
    outputTokens,
    costUsd,
    latencyMs: null,
    durationMs: Date.now() - startTime,
    startedAt,
    completedAt,
    projectId: null,
    effort: null,
  });

  if (status === "success") {
    await recordCallResult(auth.id, automation.provider, "success");
  } else if (errorMessage) {
    await recordCallResult(auth.id, automation.provider, "error", await sanitizeErrorMessage(auth.id, errorMessage, automation.provider));
  }

  await updateAutomationLastRun(auth.id, automation.id, completedAt);

  let file: FileRow | null = null;
  if (status === "success" && automation.outputType === "code" && responseText) {
    const { content, extension } = extractCodeFile(responseText);
    const filename = resolveFilename(automation.name, automation.filename, extension);
    const buffer = Buffer.from(content, "utf8");
    const url = await storeFile(filename, buffer, mimeTypeForExtension(extension));
    file = await insertFile(auth.id, {
      filename,
      mimeType: mimeTypeForExtension(extension),
      size: buffer.byteLength,
      path: url,
    });
  }

  return NextResponse.json({ runId, status, responseText, errorMessage, file });
}
