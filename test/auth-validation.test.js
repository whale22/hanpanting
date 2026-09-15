import assert from "node:assert/strict";
import test from "node:test";

import {
  validateLoginInput,
  validateSignupInput
} from "../lib/auth-validation.js";

test("로그인 입력의 이메일을 정리한다", () => {
  const result = validateLoginInput({
    email: "  USER@Example.COM ",
    password: "password123"
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.email, "user@example.com");
});

test("짧은 비밀번호를 거부한다", () => {
  const result = validateLoginInput({
    email: "user@example.com",
    password: "short"
  });

  assert.deepEqual(result, { ok: false, errorCode: "INVALID_PASSWORD" });
});

test("가입할 때 정리된 이메일을 Better Auth 내부 이름으로 사용한다", () => {
  const result = validateSignupInput({
    email: "  USER@Example.COM ",
    password: "password123"
  });

  assert.deepEqual(result, {
    ok: true,
    value: {
      email: "user@example.com",
      password: "password123",
      name: "user@example.com"
    }
  });
});
