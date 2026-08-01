"use client";

import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProviderSquareBadge } from "@/components/dashboard/ProviderSquareBadge";
import { PROVIDER_IDS, PROVIDER_LABELS, type KeysStatusResponse, type ProviderId } from "@/lib/config/types";
import { cn } from "@/lib/utils";

interface ProviderToggleRowProps {
  selected: ProviderId[];
  onToggle: (provider: ProviderId) => void;
  keysStatus: KeysStatusResponse | undefined;
}

export function ProviderToggleRow({ selected, onToggle, keysStatus }: ProviderToggleRowProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {PROVIDER_IDS.map((provider) => {
        const configured = keysStatus?.providers[provider]?.configured ?? false;
        return (
          <Tooltip key={provider}>
            <TooltipTrigger
              render={
                <label
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-border px-3 py-2.5",
                    !configured && "opacity-50",
                  )}
                >
                  <ProviderSquareBadge provider={provider} />
                  <span className="flex-1 truncate text-sm text-foreground">{PROVIDER_LABELS[provider]}</span>
                  <Switch
                    size="sm"
                    checked={selected.includes(provider)}
                    onCheckedChange={() => onToggle(provider)}
                    disabled={!configured}
                  />
                </label>
              }
            />
            {!configured && <TooltipContent>API 키가 등록되지 않았습니다.</TooltipContent>}
          </Tooltip>
        );
      })}
    </div>
  );
}
