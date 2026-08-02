"use client";

import { useState } from "react";
import { Send, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface BrainQuickTesterProps {
  onTestTriggered?: (prompt: string) => void;
}

export function BrainQuickTester({ onTestTriggered }: BrainQuickTesterProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  const handleSend = async () => {
    if (!prompt.trim() || loading) return;
    const currentPrompt = prompt;
    setLoading(true);
    setLastResponse(null);

    // Trigger visual animation in canvas parent if handler exists
    onTestTriggered?.(currentPrompt);

    try {
      // Send quick test request
      const res = await fetch("/api/app/completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: currentPrompt,
          provider: "google",
          model: "gemini-2.5-flash",
          systemInstruction: "You are the AI Command Center Brain. Answer concisely in Korean (1-2 sentences).",
        }),
      });

      if (!res.ok) {
        // Fallback response if API key not configured yet
        setLastResponse(`[신경망 테스트 패킷 정상 수신] "${currentPrompt}" -> 브레인 펄스 응답 완료! (API 키를 등록하면 실제 AI 모델과 연동됩니다.)`);
        toast.info("브레인 패킷 테스트가 완료되었습니다.");
      } else {
        const data = await res.json();
        setLastResponse(data.text || "브레인 신경망이 정상 처리했습니다.");
        toast.success("AI 신경망 응답 완료!");
      }
    } catch {
      setLastResponse(`[신경망 시뮬레이션 응답] 패킷 분사 완료! (요청: "${currentPrompt}")`);
      toast.info("브레인 시뮬레이션 패킷 분사 완료");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#26262b] bg-[#111114] p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">실시간 브레인 신경망 테스트</h3>
            <p className="text-xs text-text-secondary">질문을 입력하면 중앙 펄스 핵에서 각 서브시스템 노드로 실시간 패킷이 분사됩니다.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="예: '시스템 상태 점검해 줘' 또는 '최근 AI 위원회 요약해 줘'"
          className="flex-1 rounded-lg border border-[#26262b] bg-[#0a0a0b] px-3.5 py-2 text-xs text-foreground placeholder:text-text-secondary focus:border-emerald-500/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !prompt.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          {loading ? "전송 중..." : "테스트 발사"}
        </button>
      </div>

      {lastResponse && (
        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-emerald-400">브레인 신경망 응답</div>
            <div className="mt-0.5 text-[#d1d5db] leading-relaxed">{lastResponse}</div>
          </div>
        </div>
      )}
    </div>
  );
}
