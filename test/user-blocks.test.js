import assert from "node:assert/strict";
import test from "node:test";

import {
  collectBlockedUserIds,
  getOtherParticipantUserId
} from "../lib/user-blocks.js";

test("내가 차단했거나 나를 차단한 사용자를 모두 매칭 제외 목록에 넣는다", () => {
  const relationships = [
    {
      blockerUserId: "current-user",
      blockedUserId: "blocked-by-me"
    },
    {
      blockerUserId: "blocked-me",
      blockedUserId: "current-user"
    },
    {
      blockerUserId: "unrelated-user-1",
      blockedUserId: "unrelated-user-2"
    }
  ];

  assert.deepEqual(
    collectBlockedUserIds("current-user", relationships).sort(),
    ["blocked-by-me", "blocked-me"]
  );
});

test("대화 참여자 중 현재 사용자가 아닌 상대방 ID를 찾는다", () => {
  const conversation = {
    participants: [
      { userId: "current-user" },
      { userId: "other-user" }
    ]
  };

  assert.equal(
    getOtherParticipantUserId(conversation, "current-user"),
    "other-user"
  );
});
