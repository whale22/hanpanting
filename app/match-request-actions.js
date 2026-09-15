import {
  hasSameOrigin,
  readForm,
  redirect
} from "../lib/http.js";
import { createWaitingMatchRequest } from "../lib/match-requests.js";
import { getRuntimeConfig } from "../lib/runtime-config.js";

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

  const result = await createWaitingMatchRequest({
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

  redirect(response, "/?matchRequested=1");
}
