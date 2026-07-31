import type { Preferences } from "@/lib/config/types";

export async function fetchPreferences(): Promise<Preferences> {
  const res = await fetch("/api/preferences");
  if (!res.ok) throw new Error("환경설정을 불러오지 못했습니다.");
  return res.json();
}

export async function savePreferencesRemote(preferences: Preferences): Promise<void> {
  const res = await fetch("/api/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });
  if (!res.ok) throw new Error("환경설정을 저장하지 못했습니다.");
}

export async function exportAllData(): Promise<void> {
  const res = await fetch("/api/export");
  if (!res.ok) throw new Error("데이터를 내보내지 못했습니다.");
  const data = await res.blob();
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ai-command-center-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function resetAllDataRemote(): Promise<void> {
  const res = await fetch("/api/reset", { method: "POST" });
  if (!res.ok) throw new Error("초기화에 실패했습니다.");
}
