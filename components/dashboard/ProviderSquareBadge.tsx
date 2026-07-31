import { ProviderMark } from "@/components/ui/provider-mark";
import { PROVIDER_META, type ProviderId } from "@/lib/config/types";

/** Square, softly-tinted frame around a provider's brand mark -- same color-mix tint technique Card.tsx uses on hover, just applied to a fixed background instead. */
export function ProviderSquareBadge({ provider }: { provider: ProviderId }) {
  const colorVar = PROVIDER_META[provider].colorVar;
  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: `color-mix(in oklch, var(${colorVar}), transparent 84%)` }}
    >
      <ProviderMark provider={provider} size="sm" />
    </div>
  );
}
