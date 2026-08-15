import { test } from "bun:test";
import assert from "node:assert/strict";
import { createCore, createInitialState } from "acp-kernel";
import { buildStatusPanel, VIABLE_RANGE_MIN_TOKENS } from "../src/index.js";

test("panel separates session accounting from sent view", () => {
  const nudge = {
    shouldInject: false,
    reason: "idle — max compressible 8106 < threshold 50000",
    compressibleRanges: [
      { startRef: "m00002", endRef: "m00005", tokens: 16 },
      { startRef: "m00010", endRef: "m00040", tokens: 8_106 },
    ],
    contextUsage: 0.43,
    tier: null,
    breakdown: { emergencyOverride: 0 },
    contextBreakdown: { system: 0, tool: 20_000, text: 4_000, code: 0, summaries: 0, total: 24_000, growth: 6_100 },
  };
  const state = {
    blocks: [],
    messageRefs: { byRaw: {}, byRef: {} },
    nudge: {},
    stats: { tokensCompressed: 0 },
    nextBlockId: 1,
    nextRunId: 1,
  };
  const text = buildStatusPanel({
    version: "billion-context-kit@0.1.0 (test)",
    tokenCount: 430_000,
    systemPromptTokens: 0,
    state: state as never,
    nudge: nudge as never,
    modelContextLimit: 1_000_000,
  });

  assert.match(text, /Context \(session accounting\): 43% \(430k \/ 1\.0M\)/);
  assert.match(text, /Sent to LLM \(after compression\): 24k/);
  assert.match(text, /Session-only \(compressed originals \+ host overhead\): 406k/);
  assert.match(text, /Token Breakdown \(sent view\):/);
  assert.doesNotMatch(text, /Framework/, "no fake Framework bucket");
  const toolLine = text.split("\n").find((l) => l.trim().startsWith("Tool"))!;
  assert.match(toolLine, / 83%/, `bar percentages must use the sent view: ${toolLine}`);
  assert.doesNotMatch(text, /m00002\.\.m00005/, "sub-viability ranges must not be listed");
});

test("panel renders blocks with topic fallback and version line", () => {
  const state = {
    blocks: [
      { blockId: "b1", tier: 1, active: true, summary: "Plugin discovery and registration walkthrough.", compressedTokens: 25_000, effectiveMessageIds: [], coveredRawIds: [], createdAt: 1 },
    ],
    messageRefs: { byRaw: {}, byRef: {} },
    nudge: {},
    stats: { tokensCompressed: 25_000 },
    nextBlockId: 2,
    nextRunId: 1,
  };
  const text = buildStatusPanel({ tokenCount: 1_000, systemPromptTokens: 0, state: state as never, nudge: undefined, modelContextLimit: 200_000 });
  assert.match(text, /Blocks: 1 active \/ 1 total \(25k tokens compressed\)/);
  assert.match(text, /\[b1\] T1 25k→\d+.*Plugin discovery and registrat…/);
  assert.doesNotMatch(text, /billion-context-kit@/);
});

test("viability floor constant stays coupled to kernel summary rules", () => {
  assert.equal(VIABLE_RANGE_MIN_TOKENS, 200);
});
