import React from "react";

import { findRecentConversationsForUser } from "../../lib/conversations.js";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short"
});

function formatConversationDate(conversation) {
  const date = conversation.lastMessageAt ?? conversation.createdAt;

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "시간 정보 없음";
  }

  return dateFormatter.format(date);
}

function findOtherParticipant(conversation, userId) {
  const participants = Array.isArray(conversation.participants)
    ? conversation.participants
    : [];

  return participants.find((participant) => participant.userId !== userId);
}

function ConversationCard({ conversation, topicTitle, userId }) {
  const otherParticipant = findOtherParticipant(conversation, userId);
  const statusLabel = conversation.status === "ACTIVE" ? "대화 중" : "종료됨";
  const matchTypeLabel = conversation.matchType === "SAME"
    ? "같은 입장"
    : "다른 입장";

  return React.createElement(
    "li",
    null,
    React.createElement(
      "article",
      { className: "conversation-card" },
      React.createElement("p", { className: "eyebrow" }, statusLabel),
      React.createElement(
        "h2",
        null,
        React.createElement(
          "a",
          { href: `/conversations/${String(conversation._id)}` },
          topicTitle ?? "종료된 주제"
        )
      ),
      React.createElement(
        "p",
        null,
        `${otherParticipant?.anonymousName ?? "익명 사용자"} · ${matchTypeLabel}`
      ),
      React.createElement(
        "small",
        { className: "conversation-time" },
        `최근 활동 ${formatConversationDate(conversation)}`
      )
    )
  );
}

export function ConversationList({ conversations, topicsById, userId }) {
  if (conversations.length === 0) {
    return React.createElement(
      "section",
      { className: "empty-state" },
      React.createElement("h2", null, "아직 참여한 대화가 없습니다"),
      React.createElement(
        "p",
        null,
        "홈에서 주제와 입장을 선택하면 새로운 대화를 시작할 수 있습니다."
      ),
      React.createElement("a", { href: "/", className: "button-link" }, "주제 보러 가기")
    );
  }

  return React.createElement(
    "ul",
    { className: "conversation-list", "aria-label": "최근 대화방" },
    ...conversations.map((conversation) =>
      React.createElement(ConversationCard, {
        conversation,
        key: String(conversation._id),
        topicTitle: topicsById.get(conversation.topicId),
        userId
      })
    )
  );
}

export default async function ConversationPage({ session }) {
  const userId = String(session.user.id);
  const { conversations, topicsById } = await findRecentConversationsForUser(userId);

  return React.createElement(
    "section",
    { className: "conversation-list-page" },
    React.createElement("p", { className: "eyebrow" }, "최근 7일"),
    React.createElement("h1", null, "내 대화방"),
    React.createElement(
      "p",
      null,
      "최근에 참여한 익명 대화를 확인할 수 있습니다."
    ),
    React.createElement(ConversationList, { conversations, topicsById, userId })
  );
}
