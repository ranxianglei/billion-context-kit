# billion-context-kit Development Specification

> **This document is the highest-priority specification. All developers (including AI Agents) MUST comply.**

## 1. Project Overview

**billion-context-kit** is the host-agnostic shared surface for all billion-context adapters: the `/acp` status panel, compressible-range viability filtering, topic fallback, and token formatting. It sits between `acp-kernel` (the engine) and the per-host adapters (billion-context-omp, billion-context-pi, billion-context-opencode, …).

### Repository Info

| Field | Value |
|-------|-------|
| npm package | `billion-context-kit` |
| GitHub | https://github.com/ranxianglei/billion-context-kit |
| License | MIT |

## 2. Architecture

```
src/
├── index.ts    # re-exports (the public surface)
├── panel.ts    # buildStatusPanel / StatusPanelInput
├── viable.ts   # VIABLE_RANGE_MIN_TOKENS / viableRanges
├── topic.ts    # topicFallback
└── format.ts   # formatCompactTokens
tests/          # bun test
```

### Hard rules

1. **Zero host imports.** No `@oh-my-pi/*`, no `@earendil-works/*`, no opencode/zod/arktype/typebox. Anything that needs a host type is passed in as a parameter by the adapter.
2. **Pure functions only.** No `fs`, no `env`, no network, no globals. The kit renders; the adapter gathers.
3. **`acp-kernel` is the ONLY dependency** and MUST be pinned to an exact version (e.g. `"0.0.23"`, never `^`). Reason: identical to the adapters' rule — the kit is bundled inline by adapters; a caret range makes resolved versions drift, breaking reproducible builds.
4. **Any `` XML in source must use hex escapes** (`\x3c`, `\x3e`) — Write/Edit tool stripping.
5. Panel text changes are **behavioral** changes for every adapter at once — bump minor (0.x) and note the change in the release PR.
6. Adapters apply `viableRanges` on EVERY recommendation surface (nudge injection, acp_status, panel). The panel does it internally; adapters must do it for their own surfaces.

## 3. Development Standards

```bash
npm run typecheck
npm test          # bun test tests/*.test.ts
npm run build     # tsup ESM + dts
```

- **No `as any`**, **No `@ts-ignore`**, **No comments unless absolutely necessary**

## 4. Git Safety Rules

Same as acp-kernel. See [acp-kernel AGENTS.md §4](https://github.com/ranxianglei/acp-kernel/blob/master/AGENTS.md).

### PR Merge — Absolute Prohibition

PR merges are **human-only**. The Agent MUST NEVER merge any PR. (Exception: the repository owner may grant explicit per-session authorization; without it, never merge.)

## 5. Release Workflow

Release branches: `YYYY-MM-DD_release-v{VERSION}`. The release commit bumps `"version"` in `package.json` and refreshes `package-lock.json`; commit message: `release v{VERSION}`.

### Cross-repo dependency: strict publish order

`acp-kernel` → `billion-context-kit` → adapters. Verify each `npm view <pkg> version` before proceeding to the next.

## 6. npm Publishing

Publishing is **human-only** (or requires the owner's explicit per-session authorization, same as PR merges). CI auto-publishes on release branch merge; manual publish only as fallback.
