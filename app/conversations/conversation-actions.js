import {
  publishConversationEnded,
  publishConversationMessage
} from "../../lib/conversation-events.js";
import {
  createMessageForConversation,
  endConversationForUser
} from "../../lib/conversations.js";
import { hasSameOrigin, readForm, redirect } from "../../lib/http.js";
import { getRuntimeConfig } from "../../lib/runtime-config.js";
import { validateConversationMessage } from "./message-validation.js";

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
  const validation = validateConversationMessage(form.get("content"));

  if (!validation.ok) {
    respondWithError(response, 400, validation.message);
    return;
  }

  const result = await createMessageForConversation({
    content: validation.content,
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

export async function endConversation(
  request,
  response,
  { conversationId, session }
) {
  const { authUrl } = getRuntimeConfig();

  if (!hasSameOrigin(request, new URL(authUrl).origin)) {
    respondWithError(response, 403, "허용되지 않은 요청입니다.");
    return;
  }

  const result = await endConversationForUser({
    conversationId,
    userId: String(session.user.id)
  });

  if (!result.ok) {
    respondWithError(response, 400, result.message);
    return;
  }

  publishConversationMessage(result.conversation, result.systemMessage);
  publishConversationEnded(result.conversation);

  if (request.headers.accept === "application/json") {
    response.writeHead(204);
    response.end();
    return;
  }

  redirect(response, `/conversations/${conversationId}`);
}
