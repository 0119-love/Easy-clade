/** Only ever used as the target of a same-origin redirect after login -- rejects anything that could send the user off-site. */
export function sanitizeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/app";
  return raw;
}
