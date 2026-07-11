# Ciutatis Upstream Merge Changelog

**Date:** 2026-07-11  
**Branch:** `merge/upstream-master-2026-07-11`  
**Merge Commit:** `7105ad80b`  
**Upstream:** `paperclipai/paperclip` `master` (`e4e12bfb8`)  
**Range:** ~618 commits since previous sync

---

## Summary

Conservative merge of upstream Paperclip into Ciutatis.

### Preserved

- Cloudflare / D1 / Workers AI / tenant provisioning
- Civic branding and schema (institutions/requests, public portal)
- Better Auth customizations
- `apps/landing` admin shell (legacy `ui/` kept deleted)

### Intentionally excluded / stubbed

- Routines (stub routes/services retained where needed)
- Feedback / telemetry
- Board-auth CLI surfaces previously removed
- Company-skills as a first-class feature (compat stub table only)
- Inbox-dismissals schema module

### Conflict strategy

1. Keep `ui/` deleted (UI lives under `apps/landing`)
2. Keep intentional deletions for excluded features
3. Accept new upstream files mapped into `apps/landing`
4. Hunk-level merge for both-modified files: prefer Ciutatis when empty/branding; filter excluded feature lines; union additive exports/scripts
5. Restore corrupted critical indexes from pre-merge Ciutatis, then add selected new schema exports (pipelines, cases, annotations, secrets, etc.)

### Follow-ups before promoting to `main`

- [ ] `pnpm install` and regenerate lockfile if needed
- [ ] `pnpm -r typecheck` and fix import/export drift from new upstream surfaces
- [ ] Confirm excluded features are not re-enabled via new routes
- [ ] Smoke `pnpm dev` (3100) and `pnpm dev:landing` (3000)
- [ ] Re-apply stash `wip: remove legacy public pages from admin shell` if still desired

### Local notes

- WIP from public-page cleanup is in `stash@{0}`
- This merge is on a branch; `main` is unchanged until you merge/fast-forward
