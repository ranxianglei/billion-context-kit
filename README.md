# billion-context-kit

Host-agnostic shared surface for [billion-context](https://github.com/ranxianglei) adapters — the **layer-3 kit** in the stack:

```
acp-kernel            layer 1  compression engine (algorithm, nudge, blocks, tiers)
billion-context-kit   layer 2  adapter-facing shared surface (this repo)
adapters (omp / pi /  layer 3  host glue: message conversion, state wiring,
opencode / …)                  schemas, event hooks — one repo per host
```

Every adapter had grown its own copy of the same panel rendering, range
recommendation filtering, and topic fallback — and they silently drifted
(a fake "Framework" bucket and an atomic batch-rejection bug each shipped in
one adapter while already fixed in another). This package is the single home
for that surface.

## What lives here

| Export | Purpose |
|---|---|
| `buildStatusPanel(input)` | The `/acp` panel: honest dual accounting (session tree vs sent-to-LLM view), nudge state, viable ranges, block list. Host passes kernel state + measured numbers; kit renders. |
| `viableRanges(ranges)` / `VIABLE_RANGE_MIN_TOKENS` | Drops fragmented ranges (<200 tokens) from every recommendation surface. Tiny ranges cannot carry a >=50-char summary and get whole batches atomically rejected by the kernel. |
| `topicFallback(summary)` | Short block topic when the model omitted one. |
| `formatCompactTokens(n)` | Footer-consistent `k`/`M` formatting. |

## What does NOT live here

- Message conversion, identity, state management, replay — these differ
  structurally per host (fold/stream vs sidecar) and stay in each adapter.
- Schemas (arktype / typebox / zod), tool registration, event hooks,
  config directories — host glue by definition.
- The compression engine — that is [acp-kernel](https://github.com/ranxianglei/acp-kernel).

Dependencies: `acp-kernel` (exact pin) and nothing else. Zero host imports,
zero `fs`/`env` access — pure functions over kernel types.

## Versioning & release order

Downstream adapters bundle this kit inline (tsup, zero runtime deps in their
dist) and pin it **exactly** (never `^`). Publish order is strict:

1. `acp-kernel` (when its API changed)
2. `billion-context-kit`
3. adapters

## Development

```bash
npm run typecheck
npm test          # bun test
npm run build     # tsup ESM + dts
```

## License

MIT
