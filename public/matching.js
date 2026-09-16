// 소영님이 테스트 위해서 임시로 만든 코드. 추후 삭제 예정
/* global document, fetch, location, setTimeout */

const matchingPage = document.querySelector("[data-matching-page]");

if (matchingPage) {
  async function checkMatchingStatus() {
    try {
      const response = await fetch("/temporary-match/status", {
        headers: { accept: "application/json" }
      });

      if (!response.ok) {
        throw new Error("매칭 상태를 확인하지 못했습니다.");
      }

      const result = await response.json();

      if (result.status === "MATCHED") {
        location.assign(`/conversations/${result.conversationId}`);
        return;
      }

      if (result.status === "IDLE") {
        location.assign("/");
        return;
      }
    } catch (_error) {
      // 일시적인 연결 오류는 다음 확인에서 다시 시도합니다.
    }

    setTimeout(checkMatchingStatus, 1000);
  }

  checkMatchingStatus();
}
