const RESEND_API_URL = "https://api.resend.com/emails";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Talks to Resend's HTTP API directly via fetch -- no SDK dependency needed.
 * Requires RESEND_API_KEY in the environment; without it, this logs and
 * no-ops rather than throwing, since callers (e.g. forgot-password) must
 * always return the same response whether or not a user account exists.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev convenience: without a Resend key there's no other way to see a
    // code/link this app "sent" -- print the body so local testing still works.
    console.warn(
      `[email] RESEND_API_KEY가 설정되지 않아 이메일을 실제로 보내지 않았습니다. (to: ${options.to}, subject: "${options.subject}")\n${options.html}`,
    );
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL || "AI Command Center <onboarding@resend.dev>";
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [options.to], subject: options.subject, html: options.html }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend API error (${res.status}): ${text}`);
  }
}
