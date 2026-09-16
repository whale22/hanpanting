// 서버가 연결된 사용자를 기억하는 파일

// 대기 중인 사용자별 연결 저장
// heartbeat 전송
// 브라우저 연결 종료 시 정리
// 매칭 완료 이벤트 발행

import {
  clearInterval,
  setInterval
} from "node:timers";

const subscribersByUserId = new Map();

// SSE 연결을 여는 함수
export function openMatchRequestEventStream(
  request,
  response,
  { userId }
) {
  response.writeHead(200, {
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "content-type": "text/event-stream; charset=utf-8",
    "x-accel-buffering": "no"
  });

  response.write("retry: 3000\n\n");

  const subscribers =
    subscribersByUserId.get(userId) ?? new Set();

  subscribers.add(response);
  subscribersByUserId.set(userId, subscribers);

  const heartbeat = setInterval(() => {
    response.write(": heartbeat\n\n");
  }, 20000);

  request.on("close", () => {
    clearInterval(heartbeat);
    subscribers.delete(response);

    if (subscribers.size === 0) {
      subscribersByUserId.delete(userId);
    }
  });
}

// 매칭 완료 이벤트를 보내는 함수
export function publishMatchFound(
  userId,
  conversationId
) {
  const subscribers =
    subscribersByUserId.get(userId);

  if (!subscribers) {
    return;
  }

  const event = {
    conversationId
  };

  for (const response of subscribers) {
    response.write("event: matched\n");
    response.write(
      `data: ${JSON.stringify(event)}\n\n`
    );

    response.end();
  }

  subscribersByUserId.delete(userId);
}