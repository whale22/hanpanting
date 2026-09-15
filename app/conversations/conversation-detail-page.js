import React from "react";

import { findConversationDetailForUser } from "../../lib/conversations.js";

const messageTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Seoul"
});

function formatMessageTime(createdAt) {
  if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
    return "시간 정보 없음";
  }

  return messageTimeFormatter.format(createdAt);
}

function getMessageDateTime(createdAt) {
  if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
    return undefined;
  }

  return createdAt.toISOString();
}

function findParticipant(conversation, userId) {
  return conversation.participants.find(
    (participant) => participant.userId === userId
  );
}

function MessageItem({ conversation, message, userId }) {
  const sender = findParticipant(conversation, message.senderUserId);
  const isMyMessage = message.senderUserId === userId;
  const senderName = isMyMessage
    ? "나"
    : sender?.anonymousName ?? "익명 사용자";

  return React.createElement(
    "li",
    { className: isMyMessage ? "message-item my-message" : "message-item" },
    React.createElement(
      "div",
      {
        className: "message-avatar",
        title: sender?.avatarCode ?? "기본 프로필"
      },
      senderName.slice(0, 1)
    ),
    React.createElement(
      "div",
      { className: "message-body" },
      React.createElement(
        "p",
        { className: "message-meta" },
        React.createElement("strong", null, senderName),
        React.createElement(
          "time",
          { dateTime: getMessageDateTime(message.createdAt) },
          formatMessageTime(message.createdAt)
        )
      ),
      React.createElement("p", { className: "message-content" }, message.content)
    )
  );
}

export function ConversationTranscript({ conversation, messages, topicTitle, userId }) {
  const otherParticipant = conversation.participants.find(
    (participant) => participant.userId !== userId
  );
  const matchTypeLabel = conversation.matchType === "SAME"
    ? "같은 입장"
    : "다른 입장";
  const statusLabel = conversation.status === "ACTIVE" ? "대화 중" : "종료된 대화";

  return React.createElement(
    "section",
    { className: "conversation-detail-page" },
    React.createElement(
      "a",
      { href: "/conversations", className: "back-link" },
      "← 대화방 목록"
    ),
    React.createElement("p", { className: "eyebrow" }, statusLabel),
    React.createElement("h1", null, topicTitle ?? "종료된 주제"),
    React.createElement(
      "p",
      { className: "conversation-summary" },
      `${otherParticipant?.anonymousName ?? "익명 사용자"} · ${matchTypeLabel}`
    ),
    messages.length === 0
      ? React.createElement("p", { className: "empty-message" }, "저장된 메시지가 없습니다.")
      : React.createElement(
          "ol",
          { className: "message-list", "aria-label": "저장된 대화 내용" },
          ...messages.map((message) =>
            React.createElement(MessageItem, {
              conversation,
              key: String(message._id),
              message,
              userId
            })
          )
        )
  );
}

export default async function ConversationDetailPage({ conversationId, session }) {
  const userId = String(session.user.id);
  const detail = await findConversationDetailForUser(conversationId, userId);

  if (!detail) {
    return null;
  }

  return React.createElement(ConversationTranscript, {
    conversation: detail.conversation,
    messages: detail.messages,
    topicTitle: detail.topicTitle,
    userId
  });
}
