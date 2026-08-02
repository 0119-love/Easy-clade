export interface CurrentUserResponse {
  email: string;
  displayName: string | null;
}

export async function fetchCurrentUser(): Promise<CurrentUserResponse> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) throw new Error("사용자 정보를 불러오지 못했습니다.");
  return res.json();
}

export async function updateDisplayName(displayName: string): Promise<CurrentUserResponse> {
  const res = await fetch("/api/auth/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "저장에 실패했습니다.");
  }
  return res.json();
}
