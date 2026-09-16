import assert from "node:assert/strict";
import test from "node:test";

import {
  createMessageEvent,
  createTypingEvent,
  shouldReceiveTypingEvent
} from "../lib/conversation-events.js";
import {
  getNextReplyTimerState,
  validateMessageContent
} from "../lib/conversations.js";

test("실시간 메시지 이벤트에서 실제 사용자 ID를 제거한다", () => {
  const conversation = {
    participants: [
      {
        userId: "sender-user-id",
        anonymousName: "용감한 수달",
        avatarCode: "green-otter"
      }
    ]
  };
  const message = {
    _id: "message-id",
    senderUserId: "sender-user-id",
    content: "안녕하세요.",
    createdAt: new Date("2026-09-15T13:00:00.000Z")
  };
  const event = createMessageEvent(conversation, message, "viewer-user-id");

  assert.equal(event.senderName, "용감한 수달");
  assert.equal(event.isMyMessage, false);
  assert.doesNotMatch(JSON.stringify(event), /sender-user-id|viewer-user-id/);
});

test("메시지 앞뒤 공백을 제거하고 빈 메시지를 거부한다", () => {
  assert.deepEqual(validateMessageContent("  안녕하세요.  "), {
    ok: true,
    content: "안녕하세요."
  });
  assert.deepEqual(validateMessageContent("   "), {
    ok: false,
    message: "메시지를 입력해 주세요."
  });
});

test("시스템 메시지는 사용자 정보 없이 전달한다", () => {
  const event = createMessageEvent(
    { participants: [] },
    {
      _id: "system-message-id",
      type: "SYSTEM",
      senderName: "시스템",
      content: "5분 뒤 자동으로 종료됩니다.",
      createdAt: new Date("2026-09-15T13:05:00.000Z")
    },
    "viewer-user-id"
  );

  assert.equal(event.isSystem, true);
  assert.equal(event.senderName, "시스템");
  assert.doesNotMatch(JSON.stringify(event), /viewer-user-id/);
});

test("입력 상태는 사용자 정보 없이 상대방에게만 전달한다", () => {
  const event = createTypingEvent(true);

  assert.deepEqual(event, { isTyping: true });
  assert.equal(shouldReceiveTypingEvent("sender-user", "sender-user"), false);
  assert.equal(shouldReceiveTypingEvent("other-user", "sender-user"), true);
  assert.doesNotMatch(JSON.stringify(event), /sender-user|other-user/);
});

test("같은 사용자가 계속 보내도 답변 대기 시작 시각을 연장하지 않는다", () => {
  const firstSentAt = new Date("2026-09-15T13:00:00.000Z");
  const laterSentAt = new Date("2026-09-15T13:09:00.000Z");
  const state = getNextReplyTimerState(
    {
      awaitingReplyFromUserId: "second-user",
      unansweredSince: firstSentAt
    },
    "first-user",
    "second-user",
    laterSentAt
  );

  assert.equal(state.awaitingReplyFromUserId, "second-user");
  assert.equal(state.unansweredSince, firstSentAt);
  assert.equal(state.clearWarning, false);
});

test("상대방이 답하면 새로운 답변 대기 구간을 시작한다", () => {
  const repliedAt = new Date("2026-09-15T13:06:00.000Z");
  const state = getNextReplyTimerState(
    {
      awaitingReplyFromUserId: "second-user",
      unansweredSince: new Date("2026-09-15T13:00:00.000Z")
    },
    "second-user",
    "first-user",
    repliedAt
  );

  assert.equal(state.awaitingReplyFromUserId, "first-user");
  assert.equal(state.unansweredSince, repliedAt);
  assert.equal(state.clearWarning, true);
});
