# @ciutatis/plugin-ciutatis-compat

Ciutatis fork compatibility plugin (`ciutatis.fork-compat`).

## Why this exists

Upstream Paperclip plugin extensions (manifest validators, managed routines/skills, environment drivers) expect shared types that Ciutatis previously stubbed inline during merges. Those ad-hoc fixes corrupted `packages/shared` during the 2026-07-11 upstream merge.

This plugin extracts and documents the intentional Ciutatis deviations:

| Area | Handling |
|------|----------|
| Plugin extension validators/types | Restored from upstream Paperclip |
| Routines / company-skill **types** | Restored for plugin manifest compatibility |
| Routines / feedback / telemetry **runtime** | Still disabled; catalogued here |
| Civic branding aliases | `institution`/`request`/`objective` in shared + dashboard widget |
| SDK naming | `PaperclipPlugin` alias of `CiutatisPlugin` in `@paperclipai/plugin-sdk` |

## Install (local)

```sh
pnpm --filter @paperclipai/shared build
pnpm --filter @paperclipai/plugin-sdk build
pnpm --filter @ciutatis/plugin-ciutatis-compat build
pnpm paperclipai plugin install ./packages/plugins/plugin-ciutatis-compat
```

## Code map

- `src/compat/` — curated exports of fork-compat shims + civic alias table
- `src/manifest.ts` / `src/worker.ts` / `src/ui/` — installable plugin surface
- `@paperclipai/shared/src/fork-compat/` — host-side stub implementations
- `@paperclipai/shared/src/civic-exports.ts` — civic types/validators layered on upstream shared barrel
