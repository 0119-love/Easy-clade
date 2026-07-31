const button = document.getElementById("connect");
const status = document.getElementById("status");

button.addEventListener("click", () => {
  button.disabled = true;
  status.textContent = "Claude 로그인 대기 중...";

  chrome.runtime.sendMessage({ type: "connect" }, (response) => {
    button.disabled = false;

    if (chrome.runtime.lastError) {
      status.textContent = `오류: ${chrome.runtime.lastError.message}`;
      return;
    }
    if (response?.ok) {
      status.textContent = "연결되었습니다. AI Command Center로 돌아가세요.";
    } else {
      status.textContent = `연결 실패: ${response?.error ?? "알 수 없는 오류"}`;
    }
  });
});
