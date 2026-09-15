import { clearInterval, setInterval } from "node:timers";

const subscribersByConversation = new Map();

export function createMessageEvent(conversation, message, viewerUserId) {
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
    isMyMessage
  };
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
