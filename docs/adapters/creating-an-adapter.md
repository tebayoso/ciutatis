---
title: Creating an Adapter
summary: Guide to building a custom adapter
---

Build a custom adapter to connect Ciutatis to any agent runtime.

<Tip>
If you're using Claude Code, the `.agents/skills/create-agent-adapter` skill can guide you through the full adapter creation process interactively. Just ask Claude to create a new adapter and it will walk you through each step.
</Tip>

## Package Structure

```
packages/adapters/<name>/
  package.json
  tsconfig.json
  src/
    index.ts            # Shared metadata
    server/
      index.ts          # Server exports
      execute.ts        # Core execution logic
      parse.ts          # Output parsing
      test.ts           # Environment diagnostics
    ui/
      index.ts          # UI exports
      parse-stdout.ts   # Transcript parser
      build-config.ts   # Config builder
    cli/
      index.ts          # CLI exports
      format-event.ts   # Terminal formatter
```

## Step 1: Root Metadata

`src/index.ts` is imported by all three consumers. Keep it dependency-free.

```ts
export const type = "my_agent";        // snake_case, globally unique
export const label = "My Agent";
export const models = [
  { id: "model-a", label: "Model A" },
];
export const agentConfigurationDoc = `# my_agent configuration
Use when: ...
Don't use when: ...
Core fields: ...
`;
```

## Step 2: Server Execute

`src/server/execute.ts` is the core. It receives an `AdapterExecutionContext` and returns an `AdapterExecutionResult`.

Key responsibilities:

1. Read config using safe helpers (`asString`, `asNumber`, etc.)
2. Build environment with `buildCiutatisEnv(agent)` plus context vars
3. Resolve session state from `runtime.sessionParams`
4. Render prompt with `renderTemplate(template, data)`
5. Spawn the process with `runChildProcess()` or call via `fetch()`
6. Parse output for usage, costs, session state, errors
7. Handle unknown session errors (retry fresh, set `clearSession: true`)

## Step 3: Environment Test

`src/server/test.ts` validates the adapter config before running.

Return structured diagnostics:

- `error` for invalid/unusable setup
- `warn` for non-blocking issues
- `info` for successful checks

## Step 4: UI Module

- `parse-stdout.ts` — converts stdout lines to `TranscriptEntry[]` for the run viewer
- `build-config.ts` — converts form values to `adapterConfig` JSON
- Config fields React component in `ui/src/adapters/<name>/config-fields.tsx`

## Step 5: CLI Module

`format-event.ts` — pretty-prints stdout for `ciutatis run --watch` using `picocolors`.

## Step 6: Register

Add the adapter to all three registries:

1. `server/src/adapters/registry.ts`
2. `ui/src/adapters/registry.ts`
3. `cli/src/adapters/registry.ts`

## Skills Injection

Make Ciutatis skills discoverable to your agent runtime without writing to the agent's working directory:

1. **Best: tmpdir + flag** — create tmpdir, symlink skills, pass via CLI flag, clean up after
2. **Acceptable: global config dir** — symlink to the runtime's global plugins directory
3. **Acceptable: env var** — point a skills path env var at the repo's `skills/` directory
4. **Last resort: prompt injection** — include skill content in the prompt template

## Cross-run workspace persistence (no-remote-git contract)

The local execution-workspace cwd is the **only** persistence boundary across runs. No adapter may depend on a git remote for cross-run state.

The supported round-trip:

- **Per-run, on the remote side.** `prepareWorkspaceForSshExecution` (in `packages/adapter-utils/src/ssh.ts`) git-bundles the local worktree and ships it to the run's remote dir. No `git remote` is set anywhere; the bundle is the transport.
- **End-of-run, in the adapter's `finally` block.** The adapter invokes `restoreRemoteWorkspace` (e.g. claude-local's `execute.ts`), which calls `restoreWorkspaceFromSshExecution` → `exportGitWorkspaceFromSsh` → `integrateImportedGitHead`. Remote commits made during the run land back in the local Mac worktree with no `git push` and no remote configured.

The invariant adapters must preserve:

- **Never `git push`** from adapter or runtime code. Operator-supplied configuration may opt in, but the default contract is no remote operations.
- **Never assume a remote exists.** The local cwd is the source of truth between runs.
- **Surface restore failures.** A failed sync-back must propagate as a run-level error, not a silent warning. The heartbeat records a `workspace_finalize` row (`succeeded`/`failed`) around `adapter.execute` so dependent issues do not wake on a stale worktree.

The invariant is pinned by the "no-remote-git contract" case in `packages/adapter-utils/src/ssh-fixture.test.ts`: it asserts `git remote` is empty before and after the round-trip and that a remote-only commit still lands locally via restore alone.

## Security

- Treat agent output as untrusted (parse defensively, never execute)
- Inject secrets via environment variables, not prompts
- Configure network access controls if the runtime supports them
- Always enforce timeout and grace period
