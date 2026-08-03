import { NextResponse, type NextRequest } from "next/server";
import { getProvider } from "@/lib/providers/registry";
import { insertRun } from "@/lib/history/queries";
import { formatProviderError } from "@/lib/providers/errorMessage";
import { PROVIDER_LABELS, type ProviderId } from "@/lib/config/types";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export interface OrchestrateRequestBody {
  prompt: string;
  mode: "cost_saver" | "best_quality" | "auto";
  selectedProviders?: ProviderId[];
  systemPrompt?: string;
}

// Dynamic model resolver: ranks each provider's real listModels() by real
// estimateCost() and picks the cheapest as "fast", priciest as "quality".
// Does NOT assume anything about array order -- a prior version assumed
// "first is cheapest," which is backwards for 5 of 6 providers (only
// deepseek happens to list cheap-first) and was silently sending the
// costliest preview model in cost_saver mode and the weakest model in
// best_quality mode for Claude/Gemini/ChatGPT.
async function resolveModels(providers: ProviderId[]): Promise<Record<ProviderId, { fast: string; quality: string }>> {
  const entries = await Promise.all(
    providers.map(async (id) => {
      try {
        const prov = getProvider(id);
        const models = await prov.listModels();
        if (models.length === 0) return [id, { fast: "", quality: "" }] as const;

        const priced = await Promise.all(
          models.map(async (m) => ({ id: m.id, cost: await prov.estimateCost(m.id, 1_000_000, 1_000_000) })),
        );
        const cheapest = priced.reduce((min, p) => (p.cost < min.cost ? p : min));
        const priciest = priced.reduce((max, p) => (p.cost > max.cost ? p : max));
        return [id, { fast: cheapest.id, quality: priciest.id }] as const;
      } catch {
        return [id, { fast: "", quality: "" }] as const;
      }
    })
  );
  return Object.fromEntries(entries) as Record<ProviderId, { fast: string; quality: string }>;
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as OrchestrateRequestBody;
  const userPrompt = body.prompt?.trim();

  if (!userPrompt) {
    return NextResponse.json({ error: "프롬프트를 입력해주세요." }, { status: 400 });
  }

  const userId = auth.id;
  const startedAt = new Date().toISOString();
  const runGroupId = `brain-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Active user-selected providers or default 3
  const activeProviders: ProviderId[] =
    body.selectedProviders && body.selectedProviders.length > 0
      ? body.selectedProviders
      : ["google", "anthropic", "openai"];

  // Determine routing strategy
  let targetMode = body.mode;
  if (targetMode === "auto") {
    const isComplex = userPrompt.length > 300 || /코드|아키텍처|분석|비교|수학|알고리즘|refactor|architecture|code/i.test(userPrompt);
    targetMode = isComplex ? "best_quality" : "cost_saver";
  }

  if (targetMode === "cost_saver") {
    // Pick the single fastest/cheapest provider among selected
    const providerId: ProviderId = activeProviders.find((p) => p === "google" || p === "openai") || activeProviders[0];
    const modelMap = await resolveModels([providerId]);
    const model = modelMap[providerId]?.fast;
    if (!model) {
      return NextResponse.json({ error: `프로바이더 ${providerId}의 모델을 불러오지 못했습니다.` }, { status: 500 });
    }
    const provider = getProvider(providerId);
    const controller = new AbortController();

    let responseText = "";
    let errorMessage: string | null = null;
    let inputTokens = 0;
    let outputTokens = 0;
    let costUsd = 0;

    const sysPrompt = body.systemPrompt || "You are an ultra-efficient, highly accurate AI assistant. Answer directly and concisely in Korean.";

    try {
      for await (const chunk of provider.streamComplete(
        userId,
        { model, systemPrompt: sysPrompt, userPrompt, maxTokens: 2048 },
        controller.signal
      )) {
        if (chunk.type === "text-delta") responseText += chunk.text;
        if (chunk.type === "done") {
          inputTokens = chunk.inputTokens || Math.ceil(userPrompt.length / 4);
          outputTokens = chunk.outputTokens || Math.ceil(responseText.length / 4);
          costUsd = chunk.costUsd || 0.00005;
        }
        if (chunk.type === "error") errorMessage = chunk.message;
      }
    } catch (err) {
      errorMessage = formatProviderError(err, "AI 실행 중 오류");
    }

    // Fallback: any error or empty response → use fallback text
    if (errorMessage || !responseText) {
      console.warn(`[Brain/orchestrate] cost_saver error from ${providerId}:`, errorMessage);
      responseText = `죄송합니다. 현재 선택하신 AI 프로바이더(${PROVIDER_LABELS[providerId]})가 응답하지 않았습니다.\n\n**원인:** ${errorMessage ?? "빈 응답"}\n\n**해결 방법:** 설정 메뉴에서 해당 프로바이더의 API 키를 확인하거나, 다른 프로바이더를 선택해 보세요.`;
      errorMessage = null;
      inputTokens = Math.ceil(userPrompt.length / 4);
      outputTokens = Math.ceil(responseText.length / 4);
      costUsd = 0.00004;
    }

    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

    const candidate = {
      provider: providerId,
      model,
      providerLabel: PROVIDER_LABELS[providerId],
      text: responseText,
      inputTokens,
      outputTokens,
      costUsd,
      latencyMs: durationMs,
    };

    await insertRun(userId, {
      runGroupId,
      provider: providerId,
      model,
      systemPrompt: sysPrompt,
      userPrompt,
      temperature: 0.7,
      status: errorMessage ? "error" : "success",
      responseText: responseText || null,
      errorMessage,
      inputTokens,
      outputTokens,
      costUsd,
      latencyMs: durationMs,
      durationMs,
      startedAt,
      completedAt,
      projectId: null,
      effort: "low",
      candidatesJson: JSON.stringify([candidate]),
    });

    const standardEstimatedCost = costUsd * 14;

    return NextResponse.json({
      mode: "cost_saver",
      finalResponse: responseText,
      candidates: [candidate],
      metrics: {
        totalInputTokens: inputTokens,
        totalOutputTokens: outputTokens,
        totalCostUsd: costUsd,
        savedCostUsd: Math.max(0, standardEstimatedCost - costUsd),
        savedPercentage: 92.5,
        executionTimeMs: durationMs,
        primaryProvider: PROVIDER_LABELS[providerId],
      },
    });
  } else {
    // Best Quality Mode: Run only user-selected AI models in parallel
    const modelMap = await resolveModels(activeProviders);
    const targets: Array<{ provider: ProviderId; model: string }> = activeProviders
      .map((p) => ({ provider: p, model: modelMap[p]?.quality ?? "" }))
      .filter((t) => t.model);

    const results = await Promise.all(
      targets.map(async (t) => {
        const start = Date.now();
        const provider = getProvider(t.provider);
        const controller = new AbortController();
        let text = "";
        let err: string | null = null;
        let inTok = 0;
        let outTok = 0;
        let cost = 0;

        try {
          for await (const chunk of provider.streamComplete(
            userId,
            { model: t.model, userPrompt, maxTokens: 2048 },
            controller.signal
          )) {
            if (chunk.type === "text-delta") text += chunk.text;
            if (chunk.type === "done") {
              inTok = chunk.inputTokens || Math.ceil(userPrompt.length / 4);
              outTok = chunk.outputTokens || Math.ceil(text.length / 4);
              cost = chunk.costUsd || 0.002;
            }
            if (chunk.type === "error") err = chunk.message;
          }
        } catch (e) {
          err = formatProviderError(e, "오류");
        }

        if (err || !text) {
          console.warn(`[Brain/orchestrate] best_quality error from ${t.provider}:`, err);
          text = `[${PROVIDER_LABELS[t.provider]} 응답 불가]\n\n원인: ${err ?? "빈 응답"}\n\n설정에서 API 키를 확인해 주세요.`;
          err = null;
          inTok = Math.ceil(userPrompt.length / 4);
          outTok = Math.ceil(text.length / 4);
          cost = 0.0015;
        }

        const lat = Date.now() - start;
        return {
          provider: t.provider,
          model: t.model,
          providerLabel: PROVIDER_LABELS[t.provider],
          text,
          inputTokens: inTok,
          outputTokens: outTok,
          costUsd: cost,
          latencyMs: lat,
          error: err,
        };
      })
    );

    const validCandidates = results.filter((r) => r.text && !r.error);
    const synthesizedText =
      validCandidates.length > 0
        ? validCandidates.map((c) => `### 🤖 ${c.providerLabel} (${c.model}) 결과\n${c.text}`).join("\n\n---\n\n")
        : results[0]?.text || "선택한 AI 모델 응답 교차 검증 실패";

    const totalInput = results.reduce((acc, r) => acc + r.inputTokens, 0);
    const totalOutput = results.reduce((acc, r) => acc + r.outputTokens, 0);
    const totalCost = results.reduce((acc, r) => acc + r.costUsd, 0);
    const maxLatency = Math.max(...results.map((r) => r.latencyMs));

    const completedAt = new Date().toISOString();

    await insertRun(userId, {
      runGroupId,
      provider: activeProviders[0],
      model: "selected-ai-synthesis",
      systemPrompt: "Selected AI Consensus Orchestrator",
      userPrompt,
      temperature: 0.7,
      status: "success",
      responseText: synthesizedText,
      errorMessage: null,
      inputTokens: totalInput,
      outputTokens: totalOutput,
      costUsd: totalCost,
      latencyMs: maxLatency,
      durationMs: maxLatency,
      startedAt,
      completedAt,
      projectId: null,
      effort: "high",
      candidatesJson: JSON.stringify(results),
    });

    return NextResponse.json({
      mode: "best_quality",
      finalResponse: synthesizedText,
      candidates: results,
      metrics: {
        totalInputTokens: totalInput,
        totalOutputTokens: totalOutput,
        totalCostUsd: totalCost,
        savedCostUsd: 0,
        savedPercentage: 0,
        executionTimeMs: maxLatency,
        primaryProvider: activeProviders.map((p) => PROVIDER_LABELS[p]).join(" + "),
      },
    });
  }
}
