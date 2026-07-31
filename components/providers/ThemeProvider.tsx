"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * next-themes was already a dependency (sonner.tsx calls useTheme()) but
 * nothing ever wrapped the app in its Provider, so that call silently fell
 * back to its default and .dark was hardcoded straight onto <html> in
 * app/layout.tsx instead. This is the actual switch: attribute="class" toggles
 * .light/.dark on <html>, enableSystem watches prefers-color-scheme when the
 * user picks "system" (see components/dashboard/ThemeToggle.tsx).
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      value={{ light: "light", dark: "dark" }}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
