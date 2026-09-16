import assert from "node:assert/strict";
import test from "node:test";

import { hasSameOrigin } from "../lib/http.js";
import { parseTrustedOrigins } from "../lib/runtime-config.js";

const trustedOrigins = [
  "http://localhost:3000",
  "http://16.184.8.18",
  "http://16.184.8.18:3000"
];

test("로컬 주소와 배포 IP의 동일 출처 요청을 허용한다", () => {
  for (const origin of trustedOrigins) {
    const request = {
      headers: {
        origin,
        "sec-fetch-site": "same-origin"
      }
    };

    assert.equal(hasSameOrigin(request, trustedOrigins), true);
  }
});

test("목록에 없거나 교차 사이트인 요청은 거부한다", () => {
  assert.equal(
    hasSameOrigin(
      {
        headers: {
          origin: "http://example.com",
          "sec-fetch-site": "same-origin"
        }
      },
      trustedOrigins
    ),
    false
  );
  assert.equal(
    hasSameOrigin(
      {
        headers: {
          origin: "http://16.184.8.18",
          "sec-fetch-site": "cross-site"
        }
      },
      trustedOrigins
    ),
    false
  );
});

test("인증 대표 주소와 추가 허용 주소를 중복 없이 정리한다", () => {
  assert.deepEqual(
    parseTrustedOrigins(
      "http://localhost:3000",
      "http://localhost:3000, http://16.184.8.18/, http://16.184.8.18:3000"
    ),
    trustedOrigins
  );
});
