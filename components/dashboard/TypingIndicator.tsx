"use client";

import { motion } from "framer-motion";

const DOT_TRANSITION = (delay: number) => ({
  duration: 0.9,
  repeat: Infinity,
  ease: "easeInOut" as const,
  delay,
});

/** "Model is thinking" signal for the gap between Run and the first token. */
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1" aria-label="응답 대기 중">
      {[0, 0.15, 0.3].map((delay) => (
        <motion.span
          key={delay}
          className="size-1.5 rounded-full bg-text-secondary"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={DOT_TRANSITION(delay)}
        />
      ))}
    </div>
  );
}
