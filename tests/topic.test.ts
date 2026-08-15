import { test } from "bun:test";
import assert from "node:assert/strict";
import { topicFallback } from "../src/topic.js";
import { formatCompactTokens } from "../src/format.js";

test("topicFallback takes the first sentence segment, ≤30 chars", () => {
  assert.equal(topicFallback("Database migration steps failed twice."), "Database migration steps faile…");
  assert.equal(topicFallback('He said "hello". More text.'), 'He said "hello"');
  assert.equal(topicFallback("Short."), "Short");
});

test("topicFallback truncates long segments at 30 chars with ellipsis", () => {
  const out = topicFallback("A".repeat(50));
  assert.equal(out.length, 31);
  assert.ok(out.endsWith("…"));
});

test("formatCompactTokens matches host footer thresholds", () => {
  assert.equal(formatCompactTokens(999), "999");
  assert.equal(formatCompactTokens(9_500), "9.5k");
  assert.equal(formatCompactTokens(430_000), "430k");
  assert.equal(formatCompactTokens(1_500_000), "1.5M");
});
