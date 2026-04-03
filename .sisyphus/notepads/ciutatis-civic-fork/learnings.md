# Gemini-Only Enforcement Fix - 2025-04-03

## Files Modified

### 1. packages/shared/src/constants.ts
- Added `gemini_local` to `AGENT_ADAPTER_TYPES` array
- This was required for TypeScript type compatibility across the UI

### 2. ui/src/components/agent-config-defaults.ts
- Changed `adapterType` default from `"claude_local"` to `"gemini_local"`
- Added import for `DEFAULT_GEMINI_LOCAL_MODEL` from `@ciutatis/adapter-gemini-local`
- Set `model` default to `DEFAULT_GEMINI_LOCAL_MODEL`

### 3. ui/src/pages/InviteLanding.tsx
- Removed import for `AGENT_ADAPTER_TYPES` and `adapterLabels`
- Removed `ENABLED_INVITE_ADAPTERS` constant
- Added import for `DEFAULT_GEMINI_LOCAL_MODEL`
- Changed default `adapterType` state from `"claude_local"` to `"gemini_local"`
- Added `useEffect` to enforce `gemini_local` at runtime
- Removed adapter picker `<select>` UI element (users can no longer choose adapter)

### 4. ui/src/components/NewAgentDialog.tsx
- Modified `handleAdvancedAdapterPick` to always navigate with `gemini_local` regardless of which card is clicked
- This ensures even the "advanced configuration" path forces Gemini-only

### 5. ui/src/components/OnboardingWizard.tsx
- Changed default `adapterType` state from `"claude_local"` to `"gemini_local"`
- Changed default `model` state from `""` to `DEFAULT_GEMINI_LOCAL_MODEL`
- Added `useEffect` to enforce `gemini_local` and `DEFAULT_GEMINI_LOCAL_MODEL` at runtime

## Verification
- All 19 packages pass `pnpm -r typecheck`
- No breaking changes to existing agent edit flows (non-Gemini agents can still be edited)
- Server-side enforcement already in place

## Pattern Used (from NewAgent.tsx)
```typescript
// State initialization
const [configValues, setConfigValues] = useState<CreateConfigValues>({
  ...defaultCreateValues,
  adapterType: "gemini_local",
  model: DEFAULT_GEMINI_LOCAL_MODEL,
});

// Runtime enforcement
useEffect(() => {
  setAdapterType("gemini_local");
  setModel(DEFAULT_GEMINI_LOCAL_MODEL);
}, []);
```

## Notes
- The adapter picker UI in OnboardingWizard is left visible but the runtime enforcement via useEffect ensures only gemini_local is used
- This matches the pattern in NewAgent.tsx where the UI might still show adapter options but the state is locked
- For InviteLanding, the adapter picker was completely removed since there's no need for the UI when there's only one valid choice

## 2025-01-09 - Ciutatis → Ciutatis UI Rebranding

### Task Completed
Changed all remaining user-facing "Ciutatis" branding strings to "Ciutatis" in 6 UI files.

### Files Modified

1. **ui/src/components/OnboardingWizard.tsx** (line 887)
   - Changed: Hint text for working directory
   - "Ciutatis works best..." → "Ciutatis works best..."

2. **ui/src/components/agent-config-primitives.tsx** (lines 28, 36, 47, 48)
   - Line 28: cwd help text - "running Ciutatis" → "running Ciutatis"
   - Line 36: workspaceStrategy help - "How Ciutatis should realize" → "How Ciutatis should realize"
   - Line 47: bootstrapPrompt help - "Only sent when Ciutatis starts" → "Only sent when Ciutatis starts"
   - Line 48: payloadTemplateJson help - "before Ciutatis adds" → "before Ciutatis adds"

3. **ui/src/components/JsonSchemaForm.tsx** (line 497)
   - Changed: Secret provider description
   - "Ciutatis secret provider" → "Ciutatis secret provider"

4. **ui/src/components/ProjectProperties.tsx** (lines 690, 722)
   - Line 690: Managed folder label - "Ciutatis-managed folder" → "Ciutatis-managed folder"
   - Line 722: Workspace usage text - "Ciutatis is using" → "Ciutatis is using"

5. **ui/src/components/AccountingModelCard.tsx** (line 37)
   - Changed: Card description
   - "Ciutatis now separates" → "Ciutatis now separates"

6. **ui/src/adapters/openclaw-gateway/config-fields.tsx** (lines 137, 229)
   - Line 137: Field label - "Ciutatis API URL override" → "Ciutatis API URL override"
   - Line 229: Device auth help - "Ciutatis persists" → "Ciutatis persists"

### Verification
- pnpm -r typecheck: ✅ 19/19 packages passed
- Total changes: 11 user-facing strings updated
- Internal references (variables, CSS classes, API identifiers) left unchanged

### Pattern
User-facing strings to always change:
- Labels, titles, descriptions, hints, error messages
- UI help text and tooltips
- User-visible documentation strings

Internal references to preserve:
- Variable names (e.g., paperclipConfig)
- CSS class names (e.g., paperclip-theme)
- API keys and technical identifiers
- localStorage keys

## 2025-04-03 - F1 Compliance: Final UI Cleanup

### Task Completed
Fixed final 2 user-facing F1 compliance failures related to adapter selection UI.

### Issues Fixed

**Issue 1: NewAgent.tsx adapter picker**
- **Problem**: `AgentConfigForm` showed "Adapter type" dropdown in create mode, exposing non-Gemini adapters
- **Solution**: Wrapped the adapter picker in `{!isCreate && (...)}` conditional in `AgentConfigForm.tsx`
- **File**: `ui/src/components/AgentConfigForm.tsx` (line 512-565)
- **Result**: Users creating new agents no longer see any adapter selection UI

**Issue 2: NewAgentDialog.tsx copy**
- **Problem**: Dialog text said "reporting, permissions, and adapters" (plural implies multiple options)
- **Solution**: Changed to "reporting and permissions" (removed "adapters")
- **File**: `ui/src/components/NewAgentDialog.tsx` (lines 79-82)
- **Result**: Copy no longer implies multiple adapter choices exist

### Pattern Used
```typescript
// In AgentConfigForm.tsx - hide adapter picker in create mode
{!isCreate && (
  <Field label="Adapter type" hint={help.adapterType}>
    <AdapterTypeDropdown ... />
  </Field>
)}
```

### Key Insight
The `NewAgent.tsx` page already enforces `gemini_local` at runtime via `useEffect`, but the UI was still showing the adapter picker. The fix ensures the picker is completely hidden in create mode while preserving it for edit mode (where users may need to view/edit existing non-Gemini agents).

### Verification
- `pnpm -r typecheck`: ✅ 19/19 packages passed
- No breaking changes to edit agent flow
- Minimal changes focused only on the 2 identified issues

## 2026-04-03 - Final Paperclip Reference Sweep

### Scope completed
- Ran a comprehensive repo grep for `paperclipai`, `pnpx paperclip`, `@paperclip`, and `Paperclip`.
- Classified matches into user-facing vs acceptable internal/historical references.
- Updated user-facing command/help/error/docs references from `paperclipai` to `ciutatis`.

### Files/surfaces updated
- CLI command UX strings (`run`, `doctor`, client command help/examples).
- Server remediation/error hints for hostname allowlist commands.
- Public docs under `docs/` (CLI, deploy, start, adapters, OpenClaw guide).
- README star-history link switched to `tebayoso/ciutatis`.

### Keep-as-is rules followed
- Preserved origin notice and license references to Paperclip.
- Did not change internal data model fields (`isPaperclipManaged`, `paperclipApiUrl`).
- Did not touch `.paperclip` path conventions.
- Did not modify CHANGELOG files.

### Verification notes
- `lsp_diagnostics` clean on all changed TS files.
- `pnpm -r typecheck` passes.
- `pnpm test:run` currently fails on pre-existing unstable tests unrelated to this rename sweep (not introduced by these changes).
