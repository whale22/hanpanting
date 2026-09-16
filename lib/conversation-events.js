import { clearInterval, setInterval } from "node:timers";

const subscribersByConversation = new Map();

export function createMessageEvent(conversation, message, viewerUserId) {
  if (message.type === "SYSTEM") {
    return {
      id: String(message._id),
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      senderName: message.senderName ?? "시스템",
      avatarCode: "system",
      isMyMessage: false,
      isSystem: true
    };
  }

  const sender = conversation.participants.find(
    (participant) => participant.userId === message.senderUserId
  );
  const isMyMessage = message.senderUserId === viewerUserId;

  return {
    id: String(message._id),
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    senderName: isMyMessage
      ? "나"
      : sender?.anonymousName ?? "익명 사용자",
    avatarCode: sender?.avatarCode ?? "default-avatar",
    isMyMessage,
    isSystem: false
  };
}

export function createTypingEvent(isTyping) {
  return { isTyping: isTyping === true };
}

export function shouldReceiveTypingEvent(viewerUserId, senderUserId) {
  return viewerUserId !== senderUserId;
}

export function openConversationEventStream(
  request,
  response,
  { conversationId, userId }
) {
  response.writeHead(200, {
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "content-type": "text/event-stream; charset=utf-8",
    "x-accel-buffering": "no"
  });
  response.write("retry: 3000\n\n");

  const subscriber = { response, userId };
  const subscribers = subscribersByConversation.get(conversationId) ?? new Set();
  subscribers.add(subscriber);
  subscribersByConversation.set(conversationId, subscribers);

  const heartbeat = setInterval(() => {
    response.write(": heartbeat\n\n");
  }, 20000);

  request.on("close", () => {
    clearInterval(heartbeat);
    subscribers.delete(subscriber);

    if (subscribers.size === 0) {
      subscribersByConversation.delete(conversationId);
    }
  });
}

export function publishConversationMessage(conversation, message) {
  const conversationId = String(conversation._id);
  const subscribers = subscribersByConversation.get(conversationId);

  if (!subscribers) {
    return;
  }

  for (const subscriber of subscribers) {
    const event = createMessageEvent(
      conversation,
      message,
      subscriber.userId
    );
    subscriber.response.write(`id: ${event.id}\n`);
    subscriber.response.write("event: message\n");
    subscriber.response.write(`data: ${JSON.stringify(event)}\n\n`);
  }
}

export function publishConversationTyping(
  conversationId,
  senderUserId,
  isTyping
) {
  const subscribers = subscribersByConversation.get(String(conversationId));

  if (!subscribers) {
    return;
  }

  const event = createTypingEvent(isTyping);

  for (const subscriber of subscribers) {
    if (!shouldReceiveTypingEvent(subscriber.userId, senderUserId)) {
      continue;
    }

    subscriber.response.write("event: typing\n");
    subscriber.response.write(`data: ${JSON.stringify(event)}\n\n`);
  }
}

export function publishConversationEnded(conversation) {
  const conversationId = String(conversation._id);
  const subscribers = subscribersByConversation.get(conversationId);

  if (!subscribers) {
    return;
  }

  for (const subscriber of subscribers) {
    subscriber.response.write("event: conversation-ended\n");
    subscriber.response.write(
      `data: ${JSON.stringify({ endedAt: conversation.endedAt.toISOString() })}\n\n`
    );
    subscriber.response.end();
  }

  subscribersByConversation.delete(conversationId);
}
