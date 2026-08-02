import type { ProviderId } from "./types";

/**
 * Plain numbered steps, not screenshots -- provider consoles get redesigned
 * often enough that a pixel-accurate screenshot goes stale fast, while a
 * short "go here, click this" description mostly survives a redesign. Each
 * list's last step is always the billing/credit reminder, since that's the
 * actual point of confusion this exists to head off (a claude.ai/ChatGPT
 * Plus subscription does NOT cover API usage -- it's a separate account and
 * a separate balance).
 */
export const PROVIDER_SETUP_STEPS: Record<ProviderId, string[]> = {
  anthropic: [
    "console.anthropic.com에서 회원가입 또는 로그인하세요 (claude.ai 계정과는 별도입니다).",
    "왼쪽 메뉴에서 API Keys로 이동해 새 키를 만드세요.",
    "생성된 키를 복사해서 아래 입력창에 붙여넣으세요.",
    "Billing 메뉴에서 크레딧을 충전해야 실제로 응답을 받을 수 있어요. claude.ai 구독료와는 별도로 결제됩니다.",
  ],
  openai: [
    "platform.openai.com에서 회원가입 또는 로그인하세요 (chatgpt.com 계정과는 별도 결제입니다).",
    "우측 상단 프로필 메뉴에서 API keys로 이동하세요.",
    "Create new secret key를 눌러 키를 만들고, 그 자리에서 바로 복사하세요 (나중에 다시 볼 수 없어요).",
    "Billing에서 결제 수단을 등록하고 최소 금액을 충전해야 사용할 수 있어요.",
  ],
  google: [
    "aistudio.google.com에 구글 계정으로 로그인하세요.",
    "Get API key 메뉴에서 새 API 키를 만드세요.",
    "생성된 키를 복사해서 아래 입력창에 붙여넣으세요.",
    "Gemini는 무료 사용량이 포함된 경우가 많아서, 별도 결제 없이 바로 사용할 수 있는 경우도 있어요.",
  ],
  xai: [
    "console.x.ai에서 회원가입 또는 로그인하세요.",
    "API Keys 메뉴에서 새 키를 만드세요.",
    "생성된 키를 복사해서 아래 입력창에 붙여넣으세요.",
    "Billing(크레딧) 메뉴에서 충전해야 실제로 사용할 수 있어요.",
  ],
  perplexity: [
    "perplexity.ai 계정으로 로그인한 뒤 설정의 API 메뉴로 이동하세요.",
    "새 키를 생성하세요.",
    "생성된 키를 복사해서 아래 입력창에 붙여넣으세요.",
    "사용한 만큼 과금되는 방식이라 결제 수단 등록이 필요해요.",
  ],
  deepseek: [
    "platform.deepseek.com에서 회원가입 또는 로그인하세요.",
    "API keys 메뉴에서 새 키를 만드세요.",
    "생성된 키를 복사해서 아래 입력창에 붙여넣으세요.",
    "Top up 메뉴에서 잔액을 충전해야 사용할 수 있어요 (다른 프로바이더보다 저렴한 편이에요).",
  ],
  openrouter: [
    "openrouter.ai에서 회원가입 또는 로그인하세요.",
    "우측 상단 프로필 메뉴의 Keys에서 새 키를 만드세요.",
    "생성된 키를 복사해서 아래 입력창에 붙여넣으세요.",
    "openrouter.ai 자체에 선불 크레딧을 충전해야 사용할 수 있어요. 키 하나로 Claude, GPT, Gemini 등 다양한 모델을 이 앱 안에서 바로 쓸 수 있는 게 장점이에요.",
  ],
};
