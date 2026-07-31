"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Segmented one-time-code input -- type a digit and it auto-advances,
 * backspace on an empty box steps back, and pasting a full code (from a
 * password manager or copied out of the email) fills every box at once.
 */
export function OtpInput({ length = 6, value, onChange, disabled, autoFocus }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function commit(nextDigits: string[]) {
    onChange(nextDigits.join(""));
  }

  function handleChange(index: number, raw: string) {
    const onlyDigits = raw.replace(/\D/g, "");
    if (!onlyDigits) {
      commit([...digits.slice(0, index), "", ...digits.slice(index + 1)]);
      return;
    }
    // Handles both a single keystroke and a full paste landing in one box.
    const next = digits.slice();
    for (let i = 0; i < onlyDigits.length && index + i < length; i++) {
      next[index + i] = onlyDigits[i];
    }
    commit(next);
    const lastFilled = Math.min(index + onlyDigits.length, length - 1);
    inputRefs.current[lastFilled]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    handleChange(0, pasted);
  }

  return (
    <div className="flex justify-center gap-2.5">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && i === 0}
          maxLength={length}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
          className={cn(
            "focus-glow size-12 rounded-lg border border-input bg-black/[0.16] text-center text-xl font-semibold text-foreground backdrop-blur-sm outline-none transition-colors duration-150 focus-visible:border-ring disabled:opacity-50",
            digit && "border-[color-mix(in_oklch,var(--primary),transparent_45%)]",
          )}
        />
      ))}
    </div>
  );
}
