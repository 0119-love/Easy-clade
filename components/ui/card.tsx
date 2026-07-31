"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The one card primitive in the app -- a Liquid Glass panel: translucent,
 * blurred, with a hairline edge and a soft top sheen (see `.glass` in
 * globals.css). On hover it lifts 3px and brightens slightly. Never stack
 * these inside each other; a screen with visible boxes everywhere is
 * exactly what this is designed to avoid.
 */
export function Card({ className, children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={cn(
        "glass rounded-xl transition-[background-color,box-shadow] duration-150 ease-out",
        "hover:bg-[color-mix(in_oklch,var(--glass-bg),white_6%)]",
        className,
      )}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
