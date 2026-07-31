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
        // Neumorphic track: a soft raised capsule when off, an inward-pressed
        // groove tinted with --primary when on -- shadow recipe shared with
        // Slider/ThemeToggle via the --neu-shadow-* tokens (see globals.css),
        // swapped rather than animated since a mid-transition blend of an
        // outward and inward shadow just looks muddy.
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        "shadow-[var(--neu-shadow-raised)] transition-[box-shadow,background-color] duration-200 ease-out",
        "data-unchecked:bg-[var(--neu-surface)]",
        // Checked track is a fuller fill than before (was a 35%-mix -- read as
        // barely-toggled) plus a thin top sheen line, so the "on" groove reads
        // as genuinely lit rather than just a shade darker than "off".
        "data-checked:bg-[color-mix(in_oklch,var(--primary),var(--neu-surface)_15%)] data-checked:shadow-[var(--neu-shadow-pressed),inset_0_1px_1px_0_rgba(255,255,255,0.18)]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        // Glass-bead thumb: a top-left specular highlight plus a soft
        // bottom-right core (raised-bead shadow recipe) layered under the
        // existing drop shadow, independent of the light/dark fill color
        // swap below -- so it reads as a lit pearl in either state.
        className="pointer-events-none block rounded-full bg-background shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.65),inset_-1px_-1px_2px_0_rgba(0,0,0,0.2),0_1px_3px_rgba(0,0,0,0.35)] ring-0 transition-transform duration-200 ease-out group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] dark:data-checked:bg-primary-foreground group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 dark:data-unchecked:bg-foreground"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
