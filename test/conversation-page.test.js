import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ConversationList } from "../dist/server/render-document.js";

test("대화방 목록에는 익명 이름과 주제만 표시된다", () => {
  const conversations = [
    {
      _id: "conversation-1",
      topicId: "topic-1",
      matchType: "OPPOSITE",
      status: "ACTIVE",
      participants: [
        { userId: "current-user", anonymousName: "차분한 고래" },
        { userId: "other-user", anonymousName: "용감한 수달" }
      ],
      createdAt: new Date("2026-09-15T00:00:00.000Z")
    }
  ];
  const html = renderToStaticMarkup(
    React.createElement(ConversationList, {
      conversations,
      topicsById: new Map([["topic-1", "예시 토론 주제"]]),
      userId: "current-user"
    })
  );

  assert.match(html, /예시 토론 주제/);
  assert.match(html, /용감한 수달/);
  assert.match(html, /다른 입장/);
  assert.doesNotMatch(html, /other-user/);
});

test("대화방이 없으면 빈 목록 안내를 표시한다", () => {
  const html = renderToStaticMarkup(
    React.createElement(ConversationList, {
      conversations: [],
      topicsById: new Map(),
      userId: "current-user"
    })
  );

  assert.match(html, /아직 참여한 대화가 없습니다/);
  assert.match(html, /주제 보러 가기/);
});
