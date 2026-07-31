import { createOpenAiCompatibleProvider } from "./openaiCompatible";
import { computeDeepseekCost } from "./pricing/deepseek";
import type { ModelInfo } from "./types";

const MODELS: ModelInfo[] = [
  { id: "deepseek-chat", label: "DeepSeek Chat", contextWindow: 128_000, maxOutputTokens: 8_192 },
  { id: "deepseek-reasoner", label: "DeepSeek Reasoner", contextWindow: 128_000, maxOutputTokens: 8_192 },
];

export const deepseekProvider = createOpenAiCompatibleProvider({
  id: "deepseek",
  label: "DeepSeek",
  baseURL: "https://api.deepseek.com",
  models: MODELS,
  computeCost: computeDeepseekCost,
});
