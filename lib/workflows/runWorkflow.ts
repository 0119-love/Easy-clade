import { getProvider } from "../providers/registry";
import type { WorkflowStep } from "./queries";

export interface WorkflowStepResult {
  stepIndex: number;
  provider: string;
  model: string;
  prompt: string;
  output: string;
  error: string | null;
}

/** Substitutes {{stepN.output}} (1-indexed) with an earlier step's accumulated output text. */
function substitute(template: string, results: WorkflowStepResult[]): string {
  return template.replace(/\{\{step(\d+)\.output\}\}/g, (_match, n: string) => {
    const idx = Number(n) - 1;
    return results[idx]?.output ?? "";
  });
}

/**
 * Runs a workflow's steps sequentially -- linear chain only, no branching.
 * Non-streaming: each step's full output is awaited before the next step's
 * prompt (which may reference it) is built. Stops the chain on the first
 * step error rather than continuing with a blank substitution.
 */
export async function runWorkflowSteps(userId: number, steps: WorkflowStep[]): Promise<WorkflowStepResult[]> {
  const results: WorkflowStepResult[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const prompt = substitute(step.promptTemplate, results);
    const provider = getProvider(step.provider);
    const controller = new AbortController();

    let output = "";
    let error: string | null = null;
    try {
      for await (const chunk of provider.streamComplete(userId, { model: step.model, userPrompt: prompt }, controller.signal)) {
        if (chunk.type === "text-delta") output += chunk.text;
        if (chunk.type === "error") error = chunk.message;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "알 수 없는 오류";
    }

    results.push({ stepIndex: i, provider: step.provider, model: step.model, prompt, output, error });
    if (error) break;
  }

  return results;
}
