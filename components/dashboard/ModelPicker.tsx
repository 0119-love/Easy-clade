"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { ModelInfo } from "@/lib/providers/types";

/** Above this many models, an unsearchable dropdown stops being usable. */
const SEARCHABLE_THRESHOLD = 20;

interface ModelPickerProps {
  models: ModelInfo[];
  value: string;
  onChange: (modelId: string) => void;
}

/**
 * A plain <Select> is fine for every native provider's short, hand-curated
 * model list. OpenRouter's catalog can run 100+ models, where scrolling an
 * unsearchable dropdown is a real UX problem -- past SEARCHABLE_THRESHOLD
 * this swaps to the same searchable Command-palette pattern already used
 * for the app's global Cmd+K (components/dashboard/CommandPalette.tsx),
 * rather than inventing a new picker pattern.
 */
export function ModelPicker({ models, value, onChange }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = models.find((m) => m.id === value);

  if (models.length <= SEARCHABLE_THRESHOLD) {
    return (
      <Select value={value} onValueChange={(v) => v && onChange(v as string)}>
        <SelectTrigger className="w-full">
          <SelectValue>{(v: string) => models.find((m) => m.id === v)?.label ?? v}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-chip flex h-8 w-full items-center justify-between gap-1.5 rounded-[10px] py-2 pr-2 pl-3 text-left text-sm text-foreground"
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="모델 검색" description={`${models.length}개 모델 중에서 검색하세요.`}>
        <CommandInput placeholder={`${models.length}개 모델 검색...`} />
        <CommandList>
          <CommandEmpty>일치하는 모델이 없어요.</CommandEmpty>
          <CommandGroup>
            {models.map((m) => (
              <CommandItem
                key={m.id}
                value={`${m.label} ${m.id}`}
                onSelect={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
              >
                <span className="truncate">{m.label}</span>
                <span className="ml-auto shrink-0 text-xs text-text-secondary">{m.id}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
