/**
 * Shared popover-open motion for Select/DropdownMenu/Tooltip content.
 *
 * tw-animate-css's `animate-in`/`animate-out` read the `--tw-duration` /
 * `--tw-ease` custom properties, which come from Tailwind's own `duration-*`
 * / `ease-*` utilities -- a plain CSS `transition-*` class has no effect on
 * these keyframe-based animations, so this has to be a class string, not a
 * CSS rule in globals.css.
 */
export const POPOVER_MOTION = "duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]";

/**
 * Springier framer-motion transition for glass pill/capsule interactions --
 * the Sidebar active-nav indicator, EffortControl's segmented-pill indicator
 * -- anything that should feel like it's being physically pushed rather
 * than eased.
 */
export const GLASS_SPRING = { type: "spring", stiffness: 500, damping: 34 } as const;
