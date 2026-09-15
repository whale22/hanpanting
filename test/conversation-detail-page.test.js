import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ConversationTranscript } from "../app/conversations/conversation-detail-page.js";

test("저장된 메시지를 참여자의 익명 이름으로 표시한다", () => {
  const conversation = {
    matchType: "OPPOSITE",
    status: "ENDED",
    participants: [
      {
        userId: "current-user",
        anonymousName: "차분한 고래",
        avatarCode: "blue-whale"
      },
      {
        userId: "other-user",
        anonymousName: "용감한 수달",
        avatarCode: "green-otter"
      }
    ]
  };
  const messages = [
    {
      _id: "message-1",
      senderUserId: "current-user",
      content: "제 생각은 이렇습니다.",
      createdAt: new Date("2026-09-14T13:00:00.000Z")
    },
    {
      _id: "message-2",
      senderUserId: "other-user",
      content: "다른 관점도 살펴보면 좋겠어요.",
      createdAt: new Date("2026-09-14T13:01:00.000Z")
    }
  ];
  const html = renderToStaticMarkup(
    React.createElement(ConversationTranscript, {
      conversation,
      messages,
      topicTitle: "예시 토론 주제",
      userId: "current-user"
    })
  );

  assert.match(html, /예시 토론 주제/);
  assert.match(html, /제 생각은 이렇습니다/);
  assert.match(html, /다른 관점도 살펴보면 좋겠어요/);
  assert.match(html, /용감한 수달/);
  assert.doesNotMatch(html, /current-user|other-user/);
});
