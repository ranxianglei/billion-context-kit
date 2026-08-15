import { defaultCountTokens, formatRanges } from "acp-kernel";
import type { CompressionState, NudgeDecision } from "acp-kernel";
import { formatCompactTokens } from "./format.js";
import { topicFallback } from "./topic.js";
import { viableRanges } from "./viable.js";

export interface StatusPanelInput {
  /** Adapter identifier for the header, e.g. "billion-context-omp@0.1.6".
   *  Omit to hide the version line. */
  version?: string;
  /** Host session accounting — the SAME number the host footer displays.
   *  It is the append-only session tree including compressed originals; it
   *  never shrinks when compression prunes the per-request view. */
  tokenCount: number;
  /** Measured token count of the host system prompt (host-specific to
   *  obtain; the kernel breakdown does not see it). */
  systemPromptTokens: number;
  /** Kernel state (blocks drive the Blocks section). */
  state: CompressionState;
  /** The nudge decision from core.processTurn for this turn, if any. The
   *  panel applies the viability filter to compressibleRanges itself. */
  nudge: NudgeDecision | undefined;
  /** Configured model context window, in tokens. */
  modelContextLimit: number;
  /** Token formatter override (defaults to formatCompactTokens). */
  fmtTokens?: (n: number) => string;
}

function bar(value: number, total: number, width: number = 20): string {
  if (total === 0) return "";
  const filled = Math.max(0, Math.min(width, Math.round((value / total) * width)));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

/** Render the /acp status panel. Two different token accountings, honestly
 *  labeled:
 *  - Session accounting (host footer): the append-only session tree
 *    INCLUDING compressed originals. It never shrinks — adapter pruning is
 *    a per-request transform view the host cannot see.
 *  - Sent view: what actually reaches the LLM after compression (kernel's
 *    chars/4 classification over the pruned projection + measured system
 *    prompt). This is the number compression controls.
 *  Never subtract one from the other into a fake bucket — on a
 *  well-compressed session that reads as "Framework 390K / 430K total",
 *  which is just the compressed originals still sitting in the tree. */
export function buildStatusPanel(input: StatusPanelInput): string {
  const { tokenCount, state, nudge, modelContextLimit } = input;
  const fmt = input.fmtTokens ?? formatCompactTokens;
  const bd = nudge?.contextBreakdown;
  const limit = modelContextLimit;
  const classified = bd ? bd.system + bd.tool + bd.summaries + bd.code + bd.text : 0;
  const systemPromptTokens = input.systemPromptTokens;
  const sentTotal = classified + systemPromptTokens;
  const sessionOnly = Math.max(0, tokenCount - sentTotal);
  const displayTotal = tokenCount;
  const displayPct = limit > 0 ? Math.round((displayTotal / limit) * 100) : 0;
  const activeBlocksList = state.blocks.filter((b) => b.active);
  const totalBlocksList = state.blocks;

  const lines: string[] = [];

  lines.push("╭─────────────────────────────────────────────╮");
  lines.push("│           ACP Context Analysis              │");
  lines.push("╰─────────────────────────────────────────────╯");
  if (input.version) lines.push(input.version);
  lines.push("");
  lines.push(`Context (session accounting): ${displayPct}% (${fmt(displayTotal)} / ${fmt(limit)})`);

  if (nudge && bd) {
    const growth = bd.growth;
    if (growth > 0 && displayTotal > 0) {
      lines.push(`Growth: +${fmt(growth)} since last nudge`);
    }
    lines.push("");
    lines.push(`Sent to LLM (after compression): ${fmt(sentTotal)}`);
    if (sessionOnly > 0) {
      lines.push(`Session-only (compressed originals + host overhead): ${fmt(sessionOnly)} — pruned from every request; the footer counts it`);
    }
    lines.push("");
    lines.push("Token Breakdown (sent view):");

    const categories: Array<{ label: string; value: number }> = [
      { label: "Tool", value: bd.tool },
      { label: "SysPrompt", value: systemPromptTokens },
      { label: "Text", value: bd.text },
      { label: "Code", value: bd.code },
      { label: "Summaries", value: bd.summaries },
    ];

    for (const cat of categories) {
      if (cat.value <= 0) continue;
      const pct = sentTotal > 0 ? Math.round((cat.value / sentTotal) * 100) : 0;
      const b = bar(cat.value, sentTotal);
      lines.push(`  ${cat.label.padEnd(10)} ${b} ${String(pct).padStart(3)}%  ${fmt(cat.value)}`);
    }
  }

  lines.push("");

  if (nudge) {
    if (nudge.shouldInject) {
      const tierInfo = nudge.tier ? ` [T${nudge.tier} distillation]` : "";
      lines.push(`Nudge: ACTIVE${tierInfo} — ${nudge.reason}`);
    } else {
      lines.push(`Nudge: idle — ${nudge.reason}`);
    }
  }

  const ranges = viableRanges(nudge?.compressibleRanges ?? []);
  const protectedRanges = nudge?.protectedRanges ?? [];
  if (ranges.length > 0 || protectedRanges.length > 0) {
    lines.push("");
    lines.push(formatRanges(ranges, protectedRanges));
  }

  if (activeBlocksList.length > 0) {
    lines.push("");
    lines.push(`Blocks: ${activeBlocksList.length} active / ${totalBlocksList.length} total (${fmt(state.stats.tokensCompressed)} tokens compressed)`);
    for (const b of activeBlocksList) {
      const topic = b.topic ? `: ${b.topic}` : `: ${topicFallback(b.summary || "")}`;
      const summaryTok = defaultCountTokens(b.summary || "");
      const origTok = b.compressedTokens > 0 ? b.compressedTokens : summaryTok;
      lines.push(`  [${b.blockId}] T${b.tier} ${fmt(origTok)}→${fmt(summaryTok)}${topic}`);
    }
  } else if (totalBlocksList.length > 0) {
    lines.push("");
    lines.push(`Blocks: 0 active / ${totalBlocksList.length} total (${fmt(state.stats.tokensCompressed)} tokens compressed)`);
  } else {
    lines.push("");
    lines.push("Blocks: none (nothing compressed yet)");
  }

  lines.push("");
  lines.push("Tag visibility: tags injected to LLM only (deep copy), not persisted in session, not shown in terminal.");

  return lines.join("\n");
}
