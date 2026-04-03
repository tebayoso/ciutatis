T12 Findings — Ciutatis Civic Fork
====================================
Date: 2026-04-03

## Locale Bug in workspace-runtime.ts

Git outputs locale-sensitive error messages. On Spanish locale systems,
`git checkout -b <branch>` outputs "una rama llamada ... ya existe" instead
of "a branch named ... already exists". The `gitErrorIncludes` helper only
checked for English strings.

Fix: Added `LC_ALL: "C"` to `executeProcess` environment in both `runGit()`
and `recordGitOperation()` functions (~lines 258 and 373).

Lesson: Any process that parses stderr/stdout for known strings must force
`LC_ALL=C` to avoid locale-dependent output.

## Stale adapter-models tests

Tests in adapter-models.test.ts assumed codex_local and cursor adapters were
registered in the server. After the Gemini-only policy removed them from
registry.ts, these tests failed expecting fallback models.

Fix: Rewrote 5 test cases to assert empty arrays for unregistered adapter types
(codex_local, cursor, opencode) since `listAdapterModels()` returns `[]` for
unknown types.

## UI index.html still has "Paperclip" title

The `ui/index.html` file has `<title>Paperclip</title>` and
`<meta name="apple-mobile-web-app-title" content="Paperclip">`. Runtime
branding markers suggest server-side injection may override this. Non-blocking
for release but should be addressed in a follow-up to fully rebrand the HTML shell.

## Dead adapter code on server

`server/src/adapters/codex-models.ts` and `server/src/adapters/cursor-models.ts`
still exist but are not imported by the registry. They're dead code — safe to
remove in a cleanup pass.

## Ciutatis branding cleanup

Updated remaining user-facing UI strings from Paperclip to Ciutatis in the
theme storage key, auth page labels, breadcrumb document title, dashboard empty
state copy, and invite landing bootstrap labels. Kept internal CSS/env names
unchanged.


## F1 Plan Compliance Audit (2026-04-03)

Verdict: REJECT

Passes:
- LICENSE remains MIT.
- README opening disclaimer is present in lines 1-13.
- ui/src/pages/NewAgent.tsx now initializes adapterType to gemini_local and re-enforces it in a mount-time useEffect.
- Shared/schema canonical civic exports are present for institutions, objectives, and requests.

Failures:
- Gemini-only is not enforced across the UI/shared layer: ui/src/pages/InviteLanding.tsx still defaults to claude_local and enables claude/codex/opencode/cursor; ui/src/components/AgentConfigForm.tsx still enables those adapters; ui/src/components/agent-config-defaults.tsx still defaults to claude_local; ui/src/components/NewAgentDialog.tsx still presents multiple non-Gemini adapters.
- User-facing Paperclip strings remain in UI: ui/src/components/OnboardingWizard.tsx, ui/src/components/agent-config-primitives.tsx, ui/src/components/JsonSchemaForm.tsx, ui/src/components/ProjectProperties.tsx, ui/src/components/AccountingModelCard.tsx, and ui/src/adapters/openclaw-gateway/config-fields.tsx. ui/index.html also still uses the paperclip.theme storage key.
- Civic terminology is only partially migrated in schema/shared: institutions, objectives, and requests are canonical, but council/channel are not clearly represented there.
- Full T1-T12 completion cannot be approved while the above Gemini-only and UI-branding gaps remain.


## Final F1 Compliance Audit (2026-04-03)

Verdict: REJECT

Verified passes:
- GitHub fork exists at https://github.com/tebayoso/ciutatis and is marked as a fork of paperclipai/paperclip.
- LICENSE preserves the MIT license and original Paperclip AI copyright.
- README lines 1-13 contain the required civic-fork/origin disclaimer.
- agent-config-defaults.ts defaults to gemini_local with DEFAULT_GEMINI_LOCAL_MODEL.
- NewAgent.tsx forces gemini_local in initial state and mount-time enforcement.
- InviteLanding.tsx defaults to gemini_local and re-enforces it on mount.
- The six recently cleaned branding files now show Ciutatis in the targeted user-facing strings.
- Shared/db civic terminology is present with canonical institution/objective/request exports and aliases back to company/goal/issue where needed.

Blocking failures:
- OnboardingWizard.tsx does not meet Gemini-only enforcement. It still renders non-Gemini adapter options (claude_local, codex_local, process, opencode_local, pi_local, cursor, openclaw_gateway), contains branch logic for those adapters, and reset() sets adapterType back to claude_local.
- NewAgentDialog.tsx still presents multiple non-Gemini adapter cards to the user. Even though navigation is forced to gemini_local, this does not satisfy a strict verify-all-entry-points Gemini-only UI requirement.
- User-facing "Paperclip" strings remain in ui/src outside the accepted internal-only set, including AgentDetail.tsx (badge label and API key help text) and DesignGuide.tsx (visible guide copy). Those are user-visible and therefore still fail branding compliance.
- T1-T12 completion cannot be fully approved from the repo because the sacred plan file .sisyphus/plans/ciutatis-civic-fork.md is not present at the expected path, so checklist completion is not independently verifiable here.


## Final F1 Plan Compliance Audit (2026-04-03, definitive pass)

Verdict: REJECT

Passing checks:
- LICENSE remains MIT and preserves original copyright.
- README lines 1-13 contain the required civic fork/origin disclaimer.
- InviteLanding.tsx no longer exposes adapter selection and keeps agent joins on gemini_local.
- OnboardingWizard.tsx user-facing adapter section shows only “Gemini CLI” with a Required badge.
- agent-config-defaults.ts defaults to gemini_local with DEFAULT_GEMINI_LOCAL_MODEL.
- Checked user-facing branding targets (Auth.tsx, Dashboard.tsx, InviteLanding.tsx, AgentDetail.tsx, DesignGuide.tsx) and found no visible “Paperclip” strings.

Blocking user-facing failures:
- NewAgent.tsx still renders AgentConfigForm, and AgentConfigForm still exposes an “Adapter type” dropdown with non-Gemini options (claude_local, codex_local, opencode_local, cursor). This means users can still see/select non-Gemini adapters from the new-agent UI.
- NewAgentDialog.tsx still tells users the CEO can configure “adapters,” which suggests multiple adapter choices still exist. This is user-facing copy and fails the strict Gemini-only UI requirement.

Internal artifacts intentionally ignored:
- OnboardingWizard.tsx dead adapter conditionals.
- Internal unions/constants/branch logic that are not visible to users.

## 2026-04-03 — F1 ROUND 4 final compliance audit

VERDICT: REJECT

- F1.1 FAIL — Gemini is not the only provider exposed in the UI. `ui/src/components/AgentConfigForm.tsx:513-565` still renders the Adapter type dropdown in edit mode, and `ui/src/components/AgentConfigForm.tsx:945-999` still builds that dropdown from all `AGENT_ADAPTER_TYPES`.
- F1.2 PASS (initialization only) — Gemini is forced at all requested entry points: `ui/src/pages/NewAgent.tsx:34-38,76-87`, `ui/src/pages/InviteLanding.tsx:33-40`, `ui/src/components/OnboardingWizard.tsx:115-118,186-189,280`, `ui/src/components/NewAgentDialog.tsx:40-42`.
- Residual non-Gemini dead code remains in UI and should be removed before approval: `ui/src/components/OnboardingWizard.tsx:57-67,203-208,304-327,736-742,925-1026`.
- F1.3 FAIL — user-facing Paperclip strings remain in UI surfaces: `ui/src/pages/RunTranscriptUxLab.tsx:213`, `ui/src/components/AgentConfigForm.tsx:1247`, `ui/src/components/OnboardingWizard.tsx:71`.
- F1.4 PASS — README origin notice is preserved at `README.md:1-13`.
- README still contains Paperclip-linked branding outside the origin notice at `README.md:21-22,27-28`.
- F1.5 PASS — rename verified in `package.json:2,19`, `cli/package.json:2,6-8`, and `server/package.json:2`.
- LSP diagnostics on `ui/src` report 0 TSX errors (2 hints only).

## POST-F1-FIX ROUND 4 (Final) - Applied 2026-04-03

### Summary
Fixed remaining F1 compliance violations to enforce Gemini-only adapter support and complete Ciutatis rebranding.

### Changes Made

**1. AgentConfigForm.tsx**
- Line 945: Changed `ENABLED_ADAPTER_TYPES` to only include `gemini_local`
- Lines 513-565: Simplified adapter type onChange handler for edit mode to only handle Gemini
- Line 1247: Replaced "PAPERCLIP_*" with "CIUTATIS_*" in environment variables help text
- Lines 15-19: Removed unused imports for codex-local and cursor-local default models

**2. OnboardingWizard.tsx**
- Lines 57-67: Simplified `AdapterType` type to only `"gemini_local"`
- Lines 27-32: Removed unused codex/cursor default model imports
- Lines 203-208: Simplified `isLocalAdapter` to single check
- Lines 209-219: Simplified `effectiveAdapterCommand` to just "gemini"
- Lines 304-336: Simplified `buildAdapterConfig()` to only handle Gemini
- Lines 111-113: Removed `forceUnsetAnthropicApiKey` and `unsetAnthropicLoading` state
- Lines 416-460: Removed `handleUnsetAnthropicApiKey()` function
- Lines 228-236: Removed `shouldSuggestUnsetAnthropicApiKey` logic
- Lines 901-922: Removed Anthropic UI block
- Lines 925-976: Simplified manual debug section for Gemini-only
- Lines 980-1026: Removed dead code for process/http/openclaw_gateway adapters
- Lines 736-742: Simplified conditional adapter fields check
- Lines 627-632: Simplified groupedModels (removed opencode_local logic)
- Lines 635-681: Removed opencode_local conditional UI blocks
- Line 32: Removed unused `OpenCodeLogoIcon` import
- Line 71: Updated GitHub URL from paperclipai to tebayoso/ciutatis

**3. RunTranscriptUxLab.tsx**
- Line 213: Replaced "Paperclip" with "Ciutatis" in description text

**4. README.md**
- Lines 21-22: Updated docs link to ciutatis.com, GitHub to tebayoso/ciutatis
- Lines 27-28: Updated license and stars badges to tebayosi/ciutatis

### Verification
- All 19 packages pass `pnpm -r typecheck` with 0 errors
- Edit mode in AgentConfigForm remains functional (adapter dropdown only shows Gemini)
- OnboardingWizard no longer contains dead code for non-Gemini adapters
- All Paperclip branding removed from user-facing strings

### Notes
- The `command`, `args`, and `url` state variables remain in OnboardingWizard as they are still passed through the adapter config (even though primarily for Gemini)
- The origin notice at top of README was preserved per requirements


## F1 ROUND 6 (FINAL) results [2026-04-03 03:46:08 -03]

VERDICT: APPROVE

- F1.1 PASS — Gemini is the only LLM provider exposed in enforced entry flows. Evidence: `ui/src/components/AgentConfigForm.tsx:908` restricts enabled adapter types to `gemini_local`; `server/src/routes/llms.ts:8` restricts LLM adapter exposure to `gemini_local`.
- F1.2 PASS — Entry points force Gemini initialization. Evidence: `ui/src/pages/NewAgent.tsx:34-38,76-87`, `ui/src/pages/InviteLanding.tsx:33-40`, `ui/src/components/OnboardingWizard.tsx:99-102,168-171,222-225`, and `ui/src/components/NewAgentDialog.tsx:42`.
- F1.3 PASS — No remaining user-facing `Paperclip` branding found in `README.md` outside the allowed origin notice; `ui/src` TSX diagnostics show 0 errors and grep results only surfaced internal identifiers/comments/icon names, not visible branding strings.
- F1.4 PASS — README preserves the origin notice at lines 1-13, and license line is now `MIT © 2026 Ciutatis` at `README.md:274`.
- F1.5 PASS — Rename verified in `package.json:2,19`, `cli/package.json:2,6-8`, and `server/package.json:2`.
- Verification — `pnpm typecheck` passed across the workspace. `lsp_diagnostics` on `ui/src` returned 0 TSX errors (2 hints only).
