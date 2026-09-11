import assert from "node:assert/strict";
import test from "node:test";

import { isSafeSeedDatabaseName } from "../scripts/seed-safety.js";

test("개발용 DB 이름은 Seed를 허용한다", () => {
  assert.equal(isSafeSeedDatabaseName("hanpanting_dev"), true);
  assert.equal(isSafeSeedDatabaseName("hanpanting-local"), true);
});

test("운영 DB처럼 보이는 이름은 Seed를 거부한다", () => {
  assert.equal(isSafeSeedDatabaseName("hanpanting_prod"), false);
  assert.equal(isSafeSeedDatabaseName("hanpanting"), false);
});
