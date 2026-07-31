import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "jane.doe+work@x.com" -> "JD". No separator found ("janedoe@x.com") -> first two letters ("JA"). */
export function emailInitials(email: string): string {
  const local = email.split("@")[0] ?? email
  const segments = local.split(/[._+-]/).filter(Boolean)
  if (segments.length >= 2) {
    return (segments[0][0] + segments[1][0]).toUpperCase()
  }
  return local.slice(0, 2).toUpperCase()
}
