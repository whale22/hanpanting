// 세션 및 동일 출처 확인
// 폼 값 읽기
// createOrMatchRequest 호출
// 매칭 성공 이벤트 발행
// 현재 신청자를 채팅방으로 리다이렉트


import {
  hasSameOrigin,
  readForm,
  redirect
} from "../lib/http.js";
import { createOrMatchRequest, cancelWaitingMatchRequest } from "../lib/match-requests.js";
import { getRuntimeConfig } from "../lib/runtime-config.js";
import {
  publishMatchFound
} from "../lib/match-request-events.js";

function respondWithError(response, statusCode, message) {
  response.writeHead(statusCode, {
    "content-type": "text/plain; charset=utf-8"
  });
  response.end(message);
}

export async function createMatchRequest(
  request,
  response,
  session
) {
  if (!session?.user?.id) {
    respondWithError(
      response,
      401,
      "로그인이 필요합니다."
    );
    return;
  }

  const { authUrl } = getRuntimeConfig();
  const expectedOrigin = new URL(authUrl).origin;

  if (!hasSameOrigin(request, expectedOrigin)) {
    respondWithError(
      response,
      403,
      "허용되지 않은 요청입니다."
    );
    return;
  }

  let form;

  try {
    form = await readForm(request);
  } catch (_error) {
    respondWithError(
      response,
      400,
      "올바른 폼 요청이 아닙니다."
    );
    return;
  }

  const result = await createOrMatchRequest({
    userId: String(session.user.id),
    topicId: form.get("topicId"),
    stance: form.get("stance"),
    matchType: form.get("matchType")
  });

  if (!result.ok) {
    redirect(
      response,
      `/?matchError=${encodeURIComponent(result.errorCode)}`
    );
    return;
  }

  if (result.status === "MATCHED") {
    if (
      !result.conversationId
      || !result.waitingUserId
    ) {
      respondWithError(
        response,
        500,
        "생성된 대화방 정보를 확인할 수 없습니다."
      );
      return;
    }

    publishMatchFound(
      result.waitingUserId,
      result.conversationId
    );

    redirect(
      response,
      `/conversations/${encodeURIComponent(
        result.conversationId
      )}`
    );

    return;
  }

  redirect(response, "/");
}

// 취소
export async function cancelMatchRequest(
  request,
  response,
  session
) {
    if (!session?.user?.id) {
        respondWithError(
        response,
        401,
        "로그인이 필요합니다."
        );
        return;
    }

    const { authUrl } = getRuntimeConfig();
    const expectedOrigin = new URL(authUrl).origin;

    if (!hasSameOrigin(request, expectedOrigin)) {
        respondWithError(
        response,
        403,
        "허용되지 않은 요청입니다."
        );
        return;
    }

  const result = await cancelWaitingMatchRequest(
    String(session.user.id)
  );

  if (!result.ok) {
    redirect(
      response,
      `/?matchError=${encodeURIComponent(result.errorCode)}`
    );
    return;
  }

  redirect(response, "/");
}