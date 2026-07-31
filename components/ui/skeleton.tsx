import { cn } from "@/lib/utils";

/** Shimmer loading placeholder. Sizing/shape comes from className (e.g. h-4 w-24 rounded-md). */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("skeleton rounded-md bg-[var(--glass-border)]", className)} {...props} />;
}
