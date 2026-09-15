import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ConversationTranscript } from "../dist/server/render-document.js";

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

test("활성 대화에는 실시간 연결과 메시지 입력 폼을 표시한다", () => {
  const conversation = {
    _id: "507f1f77bcf86cd799439011",
    matchType: "OPPOSITE",
    status: "ACTIVE",
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
  const html = renderToStaticMarkup(
    React.createElement(ConversationTranscript, {
      conversation,
      messages: [],
      topicTitle: "실시간 대화 주제",
      userId: "current-user"
    })
  );

  assert.match(html, /data-realtime-chat="true"/);
  assert.match(html, /action="\/conversations\/507f1f77bcf86cd799439011\/messages"/);
  assert.match(html, /action="\/conversations\/507f1f77bcf86cd799439011\/end"/);
  assert.match(html, />채팅 종료하기<\/button>/);
  assert.match(html, /src="\/assets\/chat.js"/);
});

test("시스템 안내 메시지를 일반 사용자와 구분해 표시한다", () => {
  const conversation = {
    _id: "507f1f77bcf86cd799439011",
    matchType: "SAME",
    status: "ENDED",
    participants: [
      { userId: "current-user", anonymousName: "차분한 고래" },
      { userId: "other-user", anonymousName: "용감한 수달" }
    ]
  };
  const messages = [
    {
      _id: "system-message",
      type: "SYSTEM",
      senderName: "시스템",
      content: "10분 동안 답변이 없어 대화가 자동으로 종료되었습니다.",
      createdAt: new Date("2026-09-15T13:10:00.000Z")
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

  assert.match(html, /class="message-item system-message"/);
  assert.match(html, />시스템<\/strong>/);
  assert.doesNotMatch(html, /채팅 종료하기/);
});
