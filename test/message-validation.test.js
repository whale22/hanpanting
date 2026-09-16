import assert from "node:assert/strict";
import test from "node:test";

import {
  containsBannedWord,
  containsLink,
  prepareBannedWordEntries,
  validateConversationMessage
} from "../app/conversations/message-validation.js";

test("금칙어의 공백과 문자 형태를 정리해 검사한다", () => {
  assert.equal(containsBannedWord("비 속 어 1"), true);
  assert.deepEqual(validateConversationMessage("비속어1"), {
    ok: false,
    message: "사용할 수 없는 표현이 포함되어 있습니다."
  });
});

test("strict 금칙어를 메시지 중간과 여러 후보에서 찾는다", () => {
  assert.equal(
    containsBannedWord("안녕하세요반갑습니다심x한x나x쁜x말"),
    true
  );
  assert.equal(
    containsBannedWord("심123456심x한x나x쁜x말"),
    true
  );
});

test("기호로 나눈 normal 금칙어도 검사한다", () => {
  assert.equal(containsBannedWord("나-쁜-말"), true);
});

test("critical 금칙어는 무제한 간격으로 오탐하지 않는다", () => {
  assert.equal(
    containsBannedWord("절abcdefghijk대abcdefghijk불abcdefghijk가"),
    false
  );
});

test("일반 도메인과 우회 표기를 링크로 검사한다", () => {
  assert.equal(containsLink("https://example.com"), true);
  assert.equal(containsLink("example dot com"), true);
  assert.equal(containsLink("example점com"), true);
  assert.equal(containsLink("example[.]com"), true);
  assert.equal(containsLink("h t t p s : / / example.com"), true);
  assert.equal(containsLink("접속 주소 192.168.0.1"), true);
});

test("버전과 날짜를 링크로 오탐하지 않는다", () => {
  assert.equal(containsLink("버전 1.2를 사용합니다"), false);
  assert.equal(containsLink("날짜는 2026.09.16입니다"), false);
});

test("금칙어 설정의 빈 word와 잘못된 level을 거부한다", () => {
  assert.throws(
    () => prepareBannedWordEntries([{ word: "", level: "normal" }]),
    /word가 비어 있습니다/
  );
  assert.throws(
    () => prepareBannedWordEntries([{ word: "테스트", level: "unknown" }]),
    /level이 올바르지 않습니다/
  );
});

test("이모지를 한 글자로 계산해 길이를 검사한다", () => {
  assert.equal(validateConversationMessage("😀".repeat(2000)).ok, true);
  assert.deepEqual(validateConversationMessage("😀".repeat(2001)), {
    ok: false,
    message: "메시지는 2000자 이하로 입력해 주세요."
  });
});

test("단독 검사 함수에 문자열이 아닌 값을 넘겨도 예외가 발생하지 않는다", () => {
  assert.equal(containsBannedWord(null), false);
  assert.equal(containsLink(undefined), false);
});
