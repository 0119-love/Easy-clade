import type { AutomationCategory, AutomationOutputType, TriggerType } from "@/lib/automations/queries";
import type { ProviderId } from "@/lib/config/types";

export interface AutomationTemplate {
  id: string;
  category: AutomationCategory;
  categoryLabel: string;
  name: string;
  description: string;
  useCase: string;
  provider: ProviderId;
  promptTemplate: string;
  triggerType: TriggerType;
  intervalMinutes: number | null;
  outputType: AutomationOutputType;
}

/**
 * One-click starting points shown on the Automations page. Each one pairs a
 * concrete use case with the trigger type that actually fits it, so the
 * manual-vs-interval choice reads as a real decision instead of a blank toggle.
 */
export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: "daily-news-brief",
    category: "content",
    categoryLabel: "콘텐츠",
    name: "오늘의 뉴스 요약",
    description: "관심 있는 주제의 최신 동향을 정리해줍니다.",
    useCase: "앱을 열어둔 채로 일정 간격마다 자동으로 요약을 받고 싶을 때",
    provider: "anthropic",
    promptTemplate:
      "AI 업계의 최신 동향을 5개 불릿으로 정리해줘. 각 항목은 한 문장으로, 왜 중요한지도 함께 적어줘.",
    triggerType: "interval",
    intervalMinutes: 120,
    outputType: "text",
  },
  {
    id: "meeting-notes-cleanup",
    category: "productivity",
    categoryLabel: "생산성",
    name: "회의록 정리기",
    description: "붙여넣은 회의 메모를 깔끔한 액션 아이템 목록으로 바꿔줍니다.",
    useCase: "회의가 끝날 때마다 버튼 한 번으로 정리하고 싶을 때",
    provider: "anthropic",
    promptTemplate:
      "다음은 방금 끝난 회의의 메모야. 이걸 '결정 사항'과 '액션 아이템(담당자 포함)'으로 나눠서 정리해줘:\n\n[여기에 회의 메모를 붙여넣으세요]",
    triggerType: "manual",
    intervalMinutes: null,
    outputType: "text",
  },
  {
    id: "boilerplate-generator",
    category: "dev",
    categoryLabel: "개발",
    name: "보일러플레이트 생성기",
    description: "설명을 주면 바로 저장 가능한 코드 파일을 생성합니다.",
    useCase: "반복적인 코드 뼈대를 매번 새로 안 짜고 싶을 때",
    provider: "anthropic",
    promptTemplate:
      "TypeScript로 REST API 클라이언트 하나를 만들어줘. fetch 기반이고, GET/POST/DELETE를 지원하고, 에러 시 명확한 메시지를 던지도록 해줘.",
    triggerType: "manual",
    intervalMinutes: null,
    outputType: "code",
  },
];
