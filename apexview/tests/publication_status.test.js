import test from "node:test";
import assert from "node:assert/strict";
import { publicationStatus } from "../src/publication_status.js";

test("a failed load cannot be reported as zero opportunities", () => {
  const result = publicationStatus({ stocks: [] }, false);
  assert.equal(result.kind, "unavailable");
  assert.equal(result.count, null);
});

test("an observed empty export is separate from unavailable data", () => {
  const result = publicationStatus({ stocks: [], counts: { failed: 0 } }, true);
  assert.equal(result.kind, "empty");
  assert.equal(result.count, 0);
  assert.match(result.note, /ไม่ใช่ผลการสแกนตลาดสด/);
});

test("fixtures stay excluded and backend order is preserved", () => {
  const rows = [{ ticker: "Z", rank: 1 }, { ticker: "RKLB", kind: "test_fixture" }, { ticker: "A", rank: 2 }];
  const before = structuredClone(rows);
  const result = publicationStatus({ stocks: rows, test_fixtures: { DEMO: {} } }, true);
  assert.equal(result.kind, "published");
  assert.equal(result.count, 2);
  assert.deepEqual(result.candidates.map((item) => item.ticker), ["Z", "A"]);
  assert.deepEqual(rows, before);
});

test("partial exports stay partial even when zero rows were published", () => {
  for (const manifest of [{ stocks: [], counts: { failed: 1 } }, { stocks: [], failures: [{ ticker: "A" }] }]) {
    const result = publicationStatus(manifest, true);
    assert.equal(result.kind, "partial");
    assert.equal(result.count, 0);
  }
});

test("missing or malformed stocks are unavailable, not an empty universe", () => {
  for (const manifest of [null, {}, { stocks: null }, { stocks: {} }]) {
    assert.equal(publicationStatus(manifest, true).kind, "unavailable");
  }
});
