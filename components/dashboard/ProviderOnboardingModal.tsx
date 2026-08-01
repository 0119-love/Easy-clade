"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProviderMark } from "@/components/ui/provider-mark";
import { PROVIDER_IDS, PROVIDER_LABELS, type KeysStatusResponse, type ProviderId } from "@/lib/config/types";
import { cn } from "@/lib/utils";

interface ProviderOnboardingModalProps {
  open: boolean;
  keysStatus: KeysStatusResponse | undefined;
  /** Preselects whatever's currently active -- only matters when reopened later from "프로바이더 관리", not on first run. */
  initialSelected?: ProviderId[];
  onComplete: (activeProviders: ProviderId[]) => void;
  /** Omit (or pass nothing) for the non-dismissible first-run flow. Passed when reopened voluntarily so Escape/outside-click can just cancel. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * First-run (and re-openable) "which AIs do you want to see" picker. A
 * provider can only be selected once its API key is configured -- picking
 * from here is meant to be instant, not a detour into typing in a key, so
 * unconfigured providers show a lock and a deep link to Settings instead of
 * a checkbox.
 */
export function ProviderOnboardingModal({
  open,
  keysStatus,
  initialSelected,
  onComplete,
  onOpenChange,
}: ProviderOnboardingModalProps) {
  const [selected, setSelected] = useState<ProviderId[]>(initialSelected ?? []);
  // Re-seed selection each time the modal transitions to open -- covers both
  // the first-run case and reopening later with a different set already
  // active. Adjusting state during render (React's documented alternative to
  // an effect here) instead of useEffect, since this dialog stays mounted
  // the whole time and only its `open` prop toggles.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSelected(initialSelected ?? []);
  }

  function toggle(id: ProviderId) {
    if (!keysStatus?.providers[id]?.configured) return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!!onOpenChange} className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI 프로바이더를 선택하세요</DialogTitle>
          <DialogDescription>워크스페이스에서 사용할 AI 프로바이더를 선택하세요.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {PROVIDER_IDS.map((id) => {
            const configured = keysStatus?.providers[id]?.configured ?? false;
            const isSelected = selected.includes(id);
            return (
              <div
                key={id}
                role="button"
                tabIndex={configured ? 0 : -1}
                aria-disabled={!configured}
                aria-pressed={isSelected}
                onClick={() => toggle(id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(id);
                  }
                }}
                className={cn(
                  "relative flex flex-col items-center gap-2.5 rounded-xl border px-3 py-4 text-center transition-colors duration-150",
                  configured
                    ? "cursor-pointer border-border hover:bg-accent/40"
                    : "cursor-not-allowed border-border/60 opacity-70",
                  isSelected && "border-primary bg-accent/40",
                )}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                )}
                <ProviderMark provider={id} />
                <span className="text-sm font-medium text-foreground">{PROVIDER_LABELS[id]}</span>
                {configured ? (
                  <span className="flex items-center gap-1 text-xs text-success">
                    <span className="size-1.5 rounded-full bg-success" /> 연결됨
                  </span>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-xs text-text-secondary">
                      <Lock className="size-3" /> API 키 필요
                    </span>
                    <Link
                      href="/settings"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-medium text-primary underline underline-offset-2 hover:no-underline"
                    >
                      API 연결하기
                    </Link>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <Button type="button" size="lg" className="w-full" disabled={selected.length === 0} onClick={() => onComplete(selected)}>
          계속하기
        </Button>
      </DialogContent>
    </Dialog>
  );
}
