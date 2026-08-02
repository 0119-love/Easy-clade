import { cn } from "@/lib/utils";

interface RingSpinnerProps {
  size?: number;
  className?: string;
}

/**
 * Faint full-circle track + a short rounded-cap arc that spins around it --
 * the loading indicator used for route transitions (see loading.tsx files)
 * and anywhere else something is pending. Track picks up the current theme
 * via currentColor; the arc stays a fixed accent so it reads the same in
 * light and dark.
 */
export function RingSpinner({ size = 56, className }: RingSpinnerProps) {
  return (
    <svg
      role="status"
      aria-label="로딩 중"
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      className={cn("text-foreground", className)}
    >
      <circle cx="25" cy="25" r="20" stroke="currentColor" strokeOpacity="0.12" strokeWidth="5" />
      <circle
        cx="25"
        cy="25"
        r="20"
        stroke="#3b82f6"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="31.4 94.2"
        className="origin-center animate-spin"
      />
    </svg>
  );
}

/** Fills the nearest positioned/flex parent and centers a RingSpinner -- drop straight into a loading.tsx. */
export function PageLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full min-h-64 w-full items-center justify-center", className)}>
      <RingSpinner />
    </div>
  );
}
