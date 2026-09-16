/* global document, EventSource, location */

// SSE 서버에 연결
// matched 이벤트 수신
// conversationId 확인
// 채팅방으로 이동

const waitingSection = document.querySelector(
  "[data-match-waiting]"
);

if (waitingSection) {
  const eventSource = new EventSource(
    "/match-requests/events"
  );

  eventSource.addEventListener(
    "matched",
    (event) => {
      const result = JSON.parse(event.data);

      if (!result.conversationId) {
        return;
      }

      eventSource.close();

      const conversationId =
        encodeURIComponent(result.conversationId);

      location.replace(
        `/conversations/${conversationId}`
      );
    }
  );
}