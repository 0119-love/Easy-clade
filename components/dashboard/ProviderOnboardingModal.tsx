"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProviderMark } from "@/components/ui/provider-mark";
import { PROVIDER_IDS, PROVIDER_LABELS, type ProviderId } from "@/lib/config/types";

interface ProviderOnboardingModalProps {
  open: boolean;
  onComplete: (activeProviders: ProviderId[]) => void;
}

/**
 * First-run "which AIs do you want to see" picker. Controlled and
 * non-dismissible (no onOpenChange, no close button) on purpose -- this is a
 * one-time setup step, not a casual popover, so Escape/outside-click
 * shouldn't silently leave `providersOnboarded` false forever.
 */
export function ProviderOnboardingModal({ open, onComplete }: ProviderOnboardingModalProps) {
  const [selected, setSelected] = useState<ProviderId[]>(PROVIDER_IDS);

  function toggle(id: ProviderId) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>어떤 AI를 사용하시나요?</DialogTitle>
          <DialogDescription>
            선택한 AI만 대시보드에 표시됩니다. 나중에 환경설정에서 언제든 바꿀 수 있어요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {PROVIDER_IDS.map((id) => (
            <label
              key={id}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-accent/40"
            >
              <span className="flex items-center gap-2 text-sm text-foreground">
                <ProviderMark provider={id} size="sm" />
                {PROVIDER_LABELS[id]}
              </span>
              <input
                type="checkbox"
                checked={selected.includes(id)}
                onChange={() => toggle(id)}
                className="size-4 accent-foreground"
              />
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" disabled={selected.length === 0} onClick={() => onComplete(selected)}>
            계속하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
