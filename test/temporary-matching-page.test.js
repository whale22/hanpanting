import assert from "node:assert/strict";
import test from "node:test";

import { renderDocument } from "../dist/server/render-document.js";

const session = {
  user: {
    id: "507f1f77bcf86cd799439011",
    name: "개발 사용자 01"
  }
};

test("메인 화면에 임시 채팅 매칭 버튼을 표시한다", () => {
  const html = renderDocument({
    page: "home",
    pageProperties: {
      databaseError: false,
      needsConfiguration: false,
      showPreview: false,
      topics: [{ _id: "topic-1", title: "첫 번째 Seed 주제" }]
    },
    session
  });

  assert.match(html, /action="\/temporary-match"/);
  assert.match(html, />채팅하기<\/button>/);
  assert.match(html, /첫 번째 주제에서 찬성 입장의 같은 의견/);
  assert.doesNotMatch(html, /<button[^>]*disabled[^>]*>채팅하기<\/button>/);
});

test("대기 화면에서 매칭 상태를 자동으로 확인한다", () => {
  const html = renderDocument({ page: "matching", session });

  assert.match(html, /data-matching-page="true"/);
  assert.match(html, /다른 사용자가 채팅하기 버튼을 누르면/);
  assert.match(html, /첫 번째 Seed 주제 · 찬성 · 같은 의견/);
  assert.match(html, /src="\/assets\/matching.js"/);
});
