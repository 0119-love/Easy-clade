import { Anthropic, DeepSeek, Gemini, Grok, OpenAI, Perplexity } from "@lobehub/icons";
import type { ComponentType } from "react";
import type { ProviderId } from "@/lib/config/types";
import { cn } from "@/lib/utils";

interface ProviderMarkProps {
  provider: ProviderId;
  size?: "sm" | "default";
  className?: string;
}

const SIZE_PX: Record<NonNullable<ProviderMarkProps["size"]>, number> = {
  sm: 24,
  default: 32,
};

// Real provider brand marks via @lobehub/icons (a dedicated icon package for
// this exact use -- accurate marks without us shipping trademarked SVGs
// ourselves). "xai" ships a Grok mark since that's the model brand xAI ships
// under; Gemini covers "google" since that's the product surfaced here, not
// the generic Google "G".
const AVATAR_BY_PROVIDER: Record<ProviderId, ComponentType<{ size: number; className?: string }>> = {
  anthropic: Anthropic.Avatar,
  openai: OpenAI.Avatar,
  google: Gemini.Avatar,
  xai: Grok.Avatar,
  perplexity: Perplexity.Avatar,
  deepseek: DeepSeek.Avatar,
};

/** Real provider brand mark in a circular frame. */
export function ProviderMark({ provider, size = "default", className }: ProviderMarkProps) {
  const Mark = AVATAR_BY_PROVIDER[provider];
  return <Mark size={SIZE_PX[size]} className={cn("shrink-0", className)} />;
}
