const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && EMAIL_RE.test(email.trim()) && email.length <= 254;
}

export function passwordError(password: unknown): string | null {
  if (typeof password !== "string" || password.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  return null;
}
