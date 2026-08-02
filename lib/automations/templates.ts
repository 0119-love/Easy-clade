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

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  // === 💻 코딩 자동화 ===
  {
    id: "code-boilerplate",
    category: "dev",
    categoryLabel: "코딩 자동화",
    name: "보일러플레이트 & 코드 자동 생성",
    description: "설명을 입력하면 바로 사용 가능한 TypeScript/React 코드 파일을 자동 생성합니다.",
    useCase: "반복적인 코드 뼈대를 매번 새로 짜지 않고 싶을 때",
    provider: "anthropic",
    promptTemplate:
      "TypeScript로 REST API 클라이언트를 만들어줘. fetch 기반이고, GET/POST/PUT/DELETE를 지원하고, 에러 시 명확한 메시지를 던지도록 해줘. 타입 정의도 포함해줘.",
    triggerType: "manual",
    intervalMinutes: null,
    outputType: "code",
  },
  {
    id: "code-review",
    category: "dev",
    categoryLabel: "코딩 자동화",
    name: "코드 리뷰 & 리팩토링",
    description: "코드를 붙여넣으면 버그, 성능 문제, 리팩토링 제안을 자동으로 정리해줍니다.",
    useCase: "혼자 작업하다 빠르게 코드 품질 점검이 필요할 때",
    provider: "anthropic",
    promptTemplate:
      "아래 코드를 리뷰해줘. 버그, 성능 개선점, 가독성 문제, 보안 이슈를 각각 섹션으로 정리하고, 각 항목마다 수정된 코드 예시도 함께 제시해줘:\n\n[여기에 코드를 붙여넣으세요]",
    triggerType: "manual",
    intervalMinutes: null,
    outputType: "text",
  },
  {
    id: "test-generator",
    category: "dev",
    categoryLabel: "코딩 자동화",
    name: "유닛 테스트 자동 생성",
    description: "함수나 컴포넌트 코드를 입력하면 Jest/Vitest 유닛 테스트를 자동으로 작성합니다.",
    useCase: "테스트 커버리지를 빠르게 높이고 싶을 때",
    provider: "anthropic",
    promptTemplate:
      "아래 TypeScript 함수에 대한 Jest 유닛 테스트를 작성해줘. 정상 케이스, 엣지 케이스, 에러 케이스를 모두 포함하고, 각 테스트에 명확한 describe/it 설명을 달아줘:\n\n[여기에 코드를 붙여넣으세요]",
    triggerType: "manual",
    intervalMinutes: null,
    outputType: "code",
  },

  // === 📧 이메일 & 리포트 자동화 ===
  {
    id: "email-draft",
    category: "productivity",
    categoryLabel: "이메일 자동화",
    name: "이메일 초안 자동 작성",
    description: "용건을 간략히 설명하면 격식 있고 완성도 높은 이메일 초안을 자동으로 작성합니다.",
    useCase: "이메일 쓰는 시간을 단축하고 싶을 때",
    provider: "anthropic",
    promptTemplate:
      "다음 내용으로 비즈니스 이메일을 작성해줘. 제목도 제안해줘.\n\n- 수신자: [받는 사람]\n- 목적: [이메일 목적]\n- 핵심 내용: [핵심 메시지]\n- 어조: [공식적/친근함]\n\n한국어와 영어 버전 둘 다 작성해줘.",
    triggerType: "manual",
    intervalMinutes: null,
    outputType: "text",
  },
  {
    id: "daily-report",
    category: "productivity",
    categoryLabel: "이메일 자동화",
    name: "일일 업무 리포트 자동 생성",
    description: "매일 업무 진행 상황을 정리한 일일 리포트를 자동으로 생성하고 파일로 저장합니다.",
    useCase: "팀에 보내는 일일 업무 보고서를 빠르게 완성하고 싶을 때",
    provider: "anthropic",
    promptTemplate:
      "오늘의 업무 진행 리포트를 작성해줘.\n\n형식:\n## 오늘 완료한 작업\n## 진행 중인 작업\n## 내일 계획\n## 블로커/이슈\n\n[오늘 진행한 업무 내용을 여기에 적어주세요]",
    triggerType: "manual",
    intervalMinutes: null,
    outputType: "text",
  },

  // === 📝 회의록 & 요약 자동화 ===
  {
    id: "meeting-notes-cleanup",
    category: "productivity",
    categoryLabel: "회의록 정리",
    name: "회의록 자동 정리기",
    description: "회의 메모를 붙여넣으면 결정사항, 담당자별 액션 아이템을 자동으로 정리합니다.",
    useCase: "회의 끝나고 정리하는 데 시간 낭비하고 싶지 않을 때",
    provider: "anthropic",
    promptTemplate:
      "다음은 방금 끝난 회의 메모야. 이걸 아래 형식으로 정리해줘:\n\n## 회의 개요\n## 주요 결정 사항\n## 액션 아이템 (담당자 | 내용 | 마감일)\n## 다음 회의 안건\n\n[여기에 회의 메모를 붙여넣으세요]",
    triggerType: "manual",
    intervalMinutes: null,
    outputType: "text",
  },
  {
    id: "document-summary",
    category: "content",
    categoryLabel: "회의록 정리",
    name: "문서 & 논문 핵심 요약",
    description: "긴 문서, 논문, 기사를 붙여넣으면 핵심 내용과 인사이트를 자동으로 요약합니다.",
    useCase: "긴 문서를 빠르게 파악하고 싶을 때",
    provider: "anthropic",
    promptTemplate:
      "다음 문서를 읽고 아래 형식으로 요약해줘:\n\n## 핵심 주장/결론 (3줄 이내)\n## 주요 포인트 5가지 (불릿 포인트)\n## 실용적 시사점\n## 더 알아볼 키워드\n\n[여기에 문서 내용을 붙여넣으세요]",
    triggerType: "manual",
    intervalMinutes: null,
    outputType: "text",
  },

  // === 🌐 뉴스 & 동향 자동화 ===
  {
    id: "daily-news-brief",
    category: "content",
    categoryLabel: "뉴스 & 동향",
    name: "오늘의 AI & 기술 동향 요약",
    description: "AI 및 기술 업계 최신 트렌드를 정기적으로 자동 요약합니다.",
    useCase: "앱을 열어둔 채로 최신 기술 동향을 놓치지 않고 싶을 때",
    provider: "anthropic",
    promptTemplate:
      "AI, 소프트웨어 개발, 스타트업 분야의 최신 동향을 5개 핵심 항목으로 정리해줘. 각 항목은 다음 형식으로:\n- 제목\n- 한 줄 요약\n- 왜 중요한지\n- 개발자에게 미치는 영향",
    triggerType: "interval",
    intervalMinutes: 120,
    outputType: "text",
  },
  {
    id: "market-analysis",
    category: "content",
    categoryLabel: "뉴스 & 동향",
    name: "시장 & 경쟁사 분석 리포트",
    description: "특정 시장이나 경쟁사 동향을 정기적으로 분석한 리포트를 자동 생성합니다.",
    useCase: "비즈니스 의사결정을 위한 시장 정보를 주기적으로 수집하고 싶을 때",
    provider: "anthropic",
    promptTemplate:
      "SaaS / AI 도구 시장의 최신 동향을 분석해줘:\n\n## 시장 트렌드\n## 주요 플레이어 움직임\n## 신규 기회 영역\n## 주의해야 할 위협 요소\n## 다음 분기 전망",
    triggerType: "interval",
    intervalMinutes: 240,
    outputType: "text",
  },

  // === ⚡ 생산성 자동화 ===
  {
    id: "task-planner",
    category: "productivity",
    categoryLabel: "생산성 자동화",
    name: "할일 목록 스마트 우선순위 정렬",
    description: "할일 목록을 입력하면 중요도·긴급도 기준으로 자동 우선순위를 매겨줍니다.",
    useCase: "해야 할 일이 너무 많아서 뭐부터 해야 할지 모를 때",
    provider: "anthropic",
    promptTemplate:
      "아래 할일 목록을 아이젠하워 매트릭스(긴급도 × 중요도)로 분류하고, 오늘 집중할 TOP 3를 선정해줘:\n\n[할일 목록을 여기에 적어주세요]",
    triggerType: "manual",
    intervalMinutes: null,
    outputType: "text",
  },
  {
    id: "weekly-review",
    category: "productivity",
    categoryLabel: "생산성 자동화",
    name: "주간 회고 & 다음 주 계획",
    description: "주간 회고를 정리하고 다음 주 목표와 계획을 자동으로 구조화합니다.",
    useCase: "매주 금요일 한 주를 마무리하고 다음 주를 준비할 때",
    provider: "anthropic",
    promptTemplate:
      "이번 주 회고와 다음 주 계획을 아래 형식으로 작성해줘:\n\n## 이번 주 성과\n## 잘된 점\n## 개선할 점\n## 다음 주 주요 목표 (최대 3개)\n## 다음 주 일정\n\n[이번 주 작업 내용을 여기에 적어주세요]",
    triggerType: "interval",
    intervalMinutes: 10080,
    outputType: "text",
  },
];

/** 5대 핵심 자동화 시스템 허브 카드 정의 */
export interface AutomationHubSystem {
  id: string;
  icon: string;
  name: string;
  description: string;
  color: string;
  borderColor: string;
  bgColor: string;
  templateIds: string[];
}

export const AUTOMATION_HUB_SYSTEMS: AutomationHubSystem[] = [
  {
    id: "coding",
    icon: "💻",
    name: "코딩 자동화",
    description: "코드 자동 생성, 코드 리뷰, 유닛 테스트 작성을 AI가 즉시 처리합니다.",
    color: "text-indigo-400",
    borderColor: "border-indigo-500/30",
    bgColor: "bg-indigo-500/5",
    templateIds: ["code-boilerplate", "code-review", "test-generator"],
  },
  {
    id: "email",
    icon: "📧",
    name: "이메일 & 리포트 자동화",
    description: "비즈니스 이메일 초안 작성부터 일일 업무 리포트까지 자동으로 생성합니다.",
    color: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    bgColor: "bg-emerald-500/5",
    templateIds: ["email-draft", "daily-report"],
  },
  {
    id: "meeting",
    icon: "📝",
    name: "회의록 & 문서 정리",
    description: "회의 메모를 구조화하고, 긴 문서와 논문을 핵심 요약으로 자동 변환합니다.",
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/5",
    templateIds: ["meeting-notes-cleanup", "document-summary"],
  },
  {
    id: "news",
    icon: "🌐",
    name: "뉴스 & 트렌드 스크랩",
    description: "AI·기술 최신 동향과 시장 분석을 정기적으로 자동 수집하고 정리합니다.",
    color: "text-cyan-400",
    borderColor: "border-cyan-500/30",
    bgColor: "bg-cyan-500/5",
    templateIds: ["daily-news-brief", "market-analysis"],
  },
  {
    id: "productivity",
    icon: "⚡",
    name: "생산성 & 업무 스케줄러",
    description: "할일 우선순위 정렬, 주간 회고, 업무 계획 자동화로 생산성을 극대화합니다.",
    color: "text-rose-400",
    borderColor: "border-rose-500/30",
    bgColor: "bg-rose-500/5",
    templateIds: ["task-planner", "weekly-review"],
  },
];
