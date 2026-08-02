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

/**
 * @lobehub/icons has no OpenRouter mark (it's a smaller/newer brand than the
 * six model vendors above). Rather than block on finding an icon asset,
 * falls back to the same "monogram in a tinted circle" this file already
 * uses in spirit for avoiding real trademark marks -- tinted with
 * --provider-openrouter (app/globals.css), same as every other provider's
 * identity color.
 */
function OpenRouterMonogram({ size, className }: { size: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        color: "var(--provider-openrouter)",
        background: "color-mix(in oklch, var(--provider-openrouter), transparent 85%)",
      }}
    >
      OR
    </span>
  );
}

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
  openrouter: OpenRouterMonogram,
};

/** Real provider brand mark in a circular frame. */
export function ProviderMark({ provider, size = "default", className }: ProviderMarkProps) {
  const Mark = AVATAR_BY_PROVIDER[provider];
  return <Mark size={SIZE_PX[size]} className={cn("shrink-0", className)} />;
}
