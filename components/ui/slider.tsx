import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        {/* Groove is recessed (pressed shadow), the thumb below pops back out
            of it (raised shadow) -- same --neu-shadow-* pair as Switch, just
            inverted which element gets which, to read as "a ball sitting in
            a channel" rather than "a lever on a raised rail". */}
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-[var(--neu-surface)] shadow-[var(--neu-shadow-pressed)] select-none data-horizontal:h-2 data-horizontal:w-full data-vertical:h-full data-vertical:w-2"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-[color-mix(in_oklch,var(--primary),transparent_15%)] select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            // Sized up from the previous h-5/w-3.5 so the capsule reads as
            // the focal "bead sitting in the groove" rather than a sliver --
            // plus an inset top sheen line layered onto the existing
            // neu-shadow-raised so the glass blur has something to catch
            // the light on, echoing the frosted capsule thumb reference.
            className="relative block h-6 w-4 shrink-0 cursor-grab select-none rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] shadow-[var(--neu-shadow-raised),inset_0_1px_1px_0_rgba(255,255,255,0.5)] backdrop-blur-sm transition-[transform,box-shadow] duration-150 ease-out after:absolute after:-inset-3 hover:scale-110 focus-visible:scale-110 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-125 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
