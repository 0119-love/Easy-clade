importScripts("config.js");

function base64UrlEncode(bytes) {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(byteLength) {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function sha256Base64Url(input) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return base64UrlEncode(new Uint8Array(digest));
}

async function connect() {
  if (!OAUTH_CONFIG.clientId || !OAUTH_CONFIG.authorizeUrl) {
    throw new Error("extension/config.js에 clientId와 authorizeUrl을 먼저 채워야 합니다.");
  }

  const redirectUri = chrome.identity.getRedirectURL();
  const codeVerifier = randomString(64);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const state = randomString(16);

  const authUrl = new URL(OAUTH_CONFIG.authorizeUrl);
  authUrl.searchParams.set("client_id", OAUTH_CONFIG.clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);
  if (OAUTH_CONFIG.scope) authUrl.searchParams.set("scope", OAUTH_CONFIG.scope);

  const redirectedTo = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true,
  });
  if (!redirectedTo) throw new Error("로그인 창이 취소되었습니다.");

  const redirectedUrl = new URL(redirectedTo);
  const returnedState = redirectedUrl.searchParams.get("state");
  const code = redirectedUrl.searchParams.get("code");

  if (returnedState !== state) throw new Error("state 값이 일치하지 않습니다 (CSRF 방지 실패).");
  if (!code) throw new Error("인가 코드가 반환되지 않았습니다.");

  const res = await fetch(`${OAUTH_CONFIG.backendOrigin}/api/auth/anthropic/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Needed so this cross-origin request still carries the app's login
    // session cookie -- keys now save per-account, not to one shared file.
    credentials: "include",
    body: JSON.stringify({ code, codeVerifier, redirectUri }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `백엔드 연결에 실패했습니다 (HTTP ${res.status}).`);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "connect") return undefined;
  connect()
    .then(() => sendResponse({ ok: true }))
    .catch((err) => sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  return true; // keep the message channel open for the async sendResponse
});
