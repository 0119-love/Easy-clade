import Link from "next/link";
import { Columns3, Gauge, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProviderMark } from "@/components/ui/provider-mark";
import { PROVIDER_IDS, PROVIDER_LABELS } from "@/lib/config/types";

const FEATURES = [
  {
    icon: Columns3,
    title: "한 화면에서 비교",
    description: "같은 질문을 여러 AI에 동시에 보내고, 답변·속도·비용을 나란히 비교합니다.",
  },
  {
    icon: Gauge,
    title: "비용 절감 인사이트",
    description: "실제 비교 기록을 근거로, 어떤 모델이 저렴하면서도 자주 이겼는지 보여줍니다.",
  },
  {
    icon: Zap,
    title: "자동화 & 에이전트",
    description: "반복 작업을 자동화하고, 코딩·번역·검색 등 프롬프트 성격에 맞게 자동으로 라우팅합니다.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex items-center gap-2">
        {PROVIDER_IDS.map((id) => (
          <ProviderMark key={id} provider={id} size="sm" />
        ))}
      </div>

      <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        AI Command Center
      </h1>
      <p className="mt-4 max-w-xl text-balance text-[15px] text-text-secondary">
        {Object.values(PROVIDER_LABELS).join(", ")}를 한 곳에서 연결해 비교하고, 비용을 추적하고, 반복 작업을
        자동화하는 멀티 프로바이더 커맨드 센터입니다.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Button size="lg" render={<Link href="/signup" />}>
          회원가입
        </Button>
        <Button size="lg" variant="outline" render={<Link href="/login" />}>
          로그인
        </Button>
      </div>

      <div className="mt-16 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card key={feature.title} className="flex flex-col items-center gap-2 p-6 text-center">
            <feature.icon className="size-5 text-text-secondary" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-foreground">{feature.title}</h2>
            <p className="text-xs text-text-secondary">{feature.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
