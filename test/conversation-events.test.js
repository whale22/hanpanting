import assert from "node:assert/strict";
import test from "node:test";

import { createMessageEvent } from "../lib/conversation-events.js";
import { validateMessageContent } from "../lib/conversations.js";

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
