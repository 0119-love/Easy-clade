/**
 * Visual content for the profile menu's "로그아웃" row. Renders as the last
 * child of a DropdownMenuItem, which already carries the named group
 * `group/dropdown-menu-item` (see components/ui/dropdown-menu.tsx) -- hover
 * *and* keyboard focus on that row (Base UI menus move real DOM focus on
 * hover) drive the door swinging open and a small figure stepping out
 * through it. Colors are fixed (not theme tokens) -- this is a standalone
 * branded widget that looks the same in light or dark mode, same as the
 * reference design.
 */
export function LogoutButtonContent() {
  return (
    <span className="relative isolate flex w-full items-center gap-2 overflow-hidden rounded-md px-2.5 py-1.5">
      <span className="absolute inset-0 z-2 rounded-md bg-[#1f2335] transition-transform duration-150 ease-out group-hover/dropdown-menu-item:-translate-y-px group-hover/dropdown-menu-item:scale-[1.02] group-focus/dropdown-menu-item:-translate-y-px group-focus/dropdown-menu-item:scale-[1.02]" />

      <svg viewBox="0 0 20 20" className="relative z-3 size-4 shrink-0 overflow-visible" aria-hidden="true">
        <rect x="3" y="2" width="9" height="16" rx="1" fill="none" stroke="#4371f7" strokeWidth="1.4" />
        <rect
          x="4.2"
          y="3.2"
          width="6.6"
          height="13.6"
          rx="0.6"
          fill="#4371f7"
          fillOpacity="0.18"
          stroke="#4371f7"
          strokeWidth="1.2"
          className="origin-[4.2px_10px] transition-transform duration-200 ease-out group-hover/dropdown-menu-item:scale-x-[0.22] group-focus/dropdown-menu-item:scale-x-[0.22]"
        />
        <circle cx="9.4" cy="9.6" r="0.5" fill="#4371f7" />

        <g className="opacity-0 transition-opacity duration-150 ease-out group-hover/dropdown-menu-item:animate-logout-walk group-hover/dropdown-menu-item:opacity-100 group-focus/dropdown-menu-item:animate-logout-walk group-focus/dropdown-menu-item:opacity-100">
          <circle cx="13" cy="6" r="1" fill="#4371f7" />
          <path
            d="M13 7v3.2M13 8l-1.4 1.3M13 8l1.6 1M13 10.2l-1.2 2M13 10.2l1.4 1.8"
            stroke="#4371f7"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>
      </svg>

      <span className="relative z-3 text-sm font-medium text-[#f4f7ff]!">로그아웃</span>
    </span>
  );
}
