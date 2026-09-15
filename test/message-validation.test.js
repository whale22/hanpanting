import assert from "node:assert/strict";
import test from "node:test";

import {
  containsBannedWord,
  validateConversationMessage
} from "../app/conversations/message-validation.js";

test("금칙어의 공백과 문자 형태를 정리해 검사한다", () => {
  assert.equal(containsBannedWord("비 속 어 1"), true);
  assert.deepEqual(validateConversationMessage("비속어1"), {
    ok: false,
    message: "사용할 수 없는 표현이 포함되어 있습니다."
  });
});
