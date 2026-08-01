import Link from "next/link";
import { ArrowRight, Columns3, Gauge, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProviderOrbit } from "@/components/landing/ProviderOrbit";
import { PROVIDER_LABELS } from "@/lib/config/types";

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
    <div className="landing-theme flex flex-1 flex-col bg-background px-6 py-16">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-16 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-xl flex-col items-center text-center lg:items-start lg:text-left">
          <h1 className="text-[40px] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[48px]">
            AI Command Center
          </h1>
          <p className="mt-4 text-balance text-[15px] leading-relaxed text-text-secondary">
            {Object.values(PROVIDER_LABELS).join(", ")}를 한 곳에서 연결해 비교하고, 비용을 추적하고, 반복 작업을
            자동화하는 멀티 프로바이더 커맨드 센터입니다.
          </p>

          <div className="mt-8 flex items-center gap-3">
            <Button size="lg" className="h-10 rounded-[10px]" render={<Link href="/signup" />}>
              회원가입 <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-10 rounded-[10px]" render={<Link href="/login" />}>
              로그인
            </Button>
          </div>
        </div>

        <ProviderOrbit />
      </div>

      <div className="mx-auto mt-24 grid w-full max-w-4xl gap-6 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card key={feature.title} className="flex flex-col items-center gap-2 p-6 text-center">
            <feature.icon className="size-5 text-text-secondary" strokeWidth={1.75} />
            <h2 className="text-base font-semibold text-foreground">{feature.title}</h2>
            <p className="text-sm text-text-secondary">{feature.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
