import { PROVIDER_LABELS, type ProviderId } from "../config/types";
import type { CommitteeContext } from "./types";

function formatContext(context: CommitteeContext): string {
  const lines: string[] = [];
  if (context.targetUsers.trim()) lines.push(`- 타겟 사용자: ${context.targetUsers.trim()}`);
  if (context.style.trim()) lines.push(`- 스타일: ${context.style.trim()}`);
  if (context.techStack.trim()) lines.push(`- 기술 스택: ${context.techStack.trim()}`);
  if (context.specialRequirements.trim()) lines.push(`- 특별 요구사항: ${context.specialRequirements.trim()}`);
  return lines.length > 0 ? `\n\n추가 컨텍스트:\n${lines.join("\n")}` : "";
}

export const PROMPT_OPTIMIZE_SYSTEM_PROMPT =
  "You rewrite a short task description into a clearer, more complete brief for a committee of AI models to execute together. Keep the original intent exactly -- add structure and missing detail, don't change the goal. Output ONLY the rewritten brief, no preamble or meta-commentary.";

export function buildPromptOptimizeUserPrompt(mission: string, context: CommitteeContext): string {
  return `${mission}${formatContext(context)}`;
}

/** No system prompt -- an initial draft is just "answer the mission," same shape as an ordinary single-shot run. */
export function buildInitialDraftUserPrompt(missionOrOptimized: string, context: CommitteeContext): string {
  return `${missionOrOptimized}${formatContext(context)}`;
}

export const CROSS_REVIEW_SYSTEM_PROMPT =
  "You are one member of a multi-model AI committee working together on a mission. Critique the OTHER members' answers below: point out errors, gaps, and what they got right. Be specific and concise. Do not restate or rewrite your own answer here -- only critique the others.";

export function buildCrossReviewUserPrompt(
  mission: string,
  ownProvider: ProviderId,
  ownAnswer: string,
  others: Array<{ provider: ProviderId; model: string; text: string }>,
): string {
  const othersLabeled = others.map((o) => `### ${PROVIDER_LABELS[o.provider]} (${o.model})\n${o.text}`).join("\n\n");
  return `미션: ${mission}\n\n당신(${PROVIDER_LABELS[ownProvider]})의 답변:\n${ownAnswer}\n\n다른 구성원들의 답변:\n\n${othersLabeled}`;
}

export const SELF_REFLECT_SYSTEM_PROMPT =
  "You are one member of a multi-model AI committee, revising your own answer based on peer critique. Output your improved answer itself -- not a description of what changed, not meta-commentary about the critique.";

export function buildSelfReflectUserPrompt(mission: string, ownAnswer: string, critiquesOfMine: string[]): string {
  const critiques = critiquesOfMine.map((c, i) => `${i + 1}. ${c}`).join("\n\n");
  return `미션: ${mission}\n\n당신의 현재 답변:\n${ownAnswer}\n\n동료들이 당신의 답변에 대해 남긴 비평:\n${critiques}\n\n위 비평을 참고해 답변을 개선하세요.`;
}

export const JUDGE_SYSTEM_PROMPT =
  "You are the judge for one loop of a multi-model AI committee refining a single answer to a mission. You will see the mission and each participating model's latest self-reflected answer. Synthesize the strongest single consensus answer, resolving disagreements explicitly rather than papering over them. Then, on its own final line with nothing else on it, output exactly `QUALITY_SCORE: <integer 0-100>` reflecting how completely and accurately the synthesized answer accomplishes the mission. Do not explain the score, just output the marker line.";

export function buildJudgeUserPrompt(
  mission: string,
  answers: Array<{ provider: ProviderId; model: string; text: string }>,
): string {
  const labeled = answers.map((a) => `### ${PROVIDER_LABELS[a.provider]} (${a.model})\n${a.text}`).join("\n\n");
  return `미션: ${mission}\n\n${labeled}`;
}

// Tolerates the marker being wrapped in markdown emphasis (e.g. **QUALITY_SCORE: 87**).
const QUALITY_SCORE_RE = /QUALITY_SCORE:\s*\**\s*(\d{1,3})\b/i;

/**
 * Parses the judge's QUALITY_SCORE marker back out and strips it from the
 * user-facing consensus text, same "extract marker, strip it" approach as
 * app/api/consensus/route.ts's WINNER_MODEL parsing. Never throws -- a
 * missing/malformed marker just means score stays null (the caller doesn't
 * treat that as a hard failure, see lib/committee/orchestrator.ts).
 */
export function parseQualityScore(resultText: string): { score: number | null; text: string } {
  const match = QUALITY_SCORE_RE.exec(resultText);
  if (!match) return { score: null, text: resultText.trim() };
  const raw = Number(match[1]);
  const score = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : null;
  const text = (resultText.slice(0, match.index) + resultText.slice(match.index + match[0].length)).trim();
  return { score, text };
}
