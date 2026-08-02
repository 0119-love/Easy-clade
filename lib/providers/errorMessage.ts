/**
 * Every vendor SDK here (Anthropic, OpenAI, and every OpenAI-compatible
 * vendor built on the `openai` package) wraps the raw HTTP error body in an
 * `.error` field, with the actual human-readable sentence one level deeper
 * at `.error.message` -- e.g. Anthropic's `{"type":"error","error":{"message":"..."}}`
 * or OpenAI's `{"error":{"message":"..."}}`. The SDK's own `Error#message`
 * getter only checks the top level, so on every real API error (which is
 * never top-level) it falls back to JSON.stringifying the whole body --
 * that raw JSON blob is what used to reach the user instead of the sentence
 * inside it. This digs the real message back out.
 */
export function extractApiErrorMessage(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;

  const structured = (err as { error?: unknown }).error;
  const fromStructured = messageFromErrorBody(structured);
  if (fromStructured) return fromStructured;

  // Fetch-based clients (or SDKs that don't expose a separate `.error`
  // field) sometimes only set `.message` to `"<status> <json>"`. Try to
  // parse the trailing JSON and pull the same shape out of it.
  const raw = (err as { message?: unknown }).message;
  if (typeof raw === "string") {
    const jsonStart = raw.indexOf("{");
    if (jsonStart !== -1) {
      try {
        const fromRaw = messageFromErrorBody(JSON.parse(raw.slice(jsonStart)));
        if (fromRaw) return fromRaw;
      } catch {
        // Not JSON after all -- fall through to the caller's own fallback.
      }
    }
  }

  return null;
}

function messageFromErrorBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const inner = (body as { error?: unknown }).error;
  if (inner && typeof inner === "object" && typeof (inner as { message?: unknown }).message === "string") {
    return (inner as { message: string }).message;
  }
  if (typeof (body as { message?: unknown }).message === "string") {
    return (body as { message: string }).message;
  }
  return null;
}

/** `extractApiErrorMessage`, falling back to the error's own message (or a caller-supplied default). */
export function formatProviderError(err: unknown, fallback: string): string {
  return extractApiErrorMessage(err) ?? (err instanceof Error ? err.message : fallback);
}
