"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        // M3 switch: unselected track is a neutral outlined pill (muted
        // fill + input-colored border); selected is a solid primary fill
        // with no border. State is carried by track fill + thumb color,
        // not shadow depth -- Material switches are flat.
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border-2 p-0.5 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-disabled:cursor-not-allowed data-disabled:opacity-50 transition-colors duration-200 ease-out",
        "data-[size=default]:h-7 data-[size=default]:w-[46px] data-[size=sm]:h-6 data-[size=sm]:w-9",
        "data-unchecked:border-input data-unchecked:bg-muted",
        "data-checked:border-primary data-checked:bg-primary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full shadow-[var(--elevation-1)] ring-0 transition-[transform,background-color] duration-200 ease-out group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-4 data-unchecked:bg-muted-foreground data-unchecked:translate-x-0 data-checked:bg-primary-foreground group-data-[size=default]/switch:data-checked:translate-x-[18px] group-data-[size=sm]/switch:data-checked:translate-x-3"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
