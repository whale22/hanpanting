import { publishConversationMessage } from "../../lib/conversation-events.js";
import { createMessageForConversation } from "../../lib/conversations.js";
import { hasSameOrigin, readForm, redirect } from "../../lib/http.js";
import { getRuntimeConfig } from "../../lib/runtime-config.js";

function respondWithError(response, statusCode, message) {
  response.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8" });
  response.end(message);
}

export async function sendConversationMessage(
  request,
  response,
  { conversationId, session }
) {
  const { authUrl } = getRuntimeConfig();

  if (!hasSameOrigin(request, new URL(authUrl).origin)) {
    respondWithError(response, 403, "허용되지 않은 요청입니다.");
    return;
  }

  const form = await readForm(request);
  const result = await createMessageForConversation({
    content: form.get("content"),
    conversationId,
    userId: String(session.user.id)
  });

  if (!result.ok) {
    respondWithError(response, 400, result.message);
    return;
  }

  publishConversationMessage(result.conversation, result.message);

  if (request.headers.accept === "application/json") {
    response.writeHead(204);
    response.end();
    return;
  }

  redirect(response, `/conversations/${conversationId}`);
}
