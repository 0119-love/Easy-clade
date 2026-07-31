"use client";

import { useEffect, useRef } from "react";
import { animate, useMotionValue, useTransform } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  className?: string;
}

/** Ticks numeric counters smoothly instead of snapping instantly -- used for token/cost readouts. */
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => (format ? format(v) : Math.round(v).toLocaleString()));
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.6, ease: "easeOut" });
    return () => controls.stop();
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = display.on("change", (latest) => {
      if (spanRef.current) spanRef.current.textContent = latest;
    });
    if (spanRef.current) spanRef.current.textContent = display.get();
    return unsubscribe;
  }, [display]);

  return <span ref={spanRef} className={className} />;
}
