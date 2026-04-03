---
title: Setup Commands
summary: Onboard, run, doctor, and configure
---

Instance setup and diagnostics commands.

## `ciutatis run`

One-command bootstrap and start:

```sh
pnpm ciutatis run
```

Does:

1. Auto-onboards if config is missing
2. Runs `ciutatis doctor` with repair enabled
3. Starts the server when checks pass

Choose a specific instance:

```sh
pnpm ciutatis run --instance dev
```

## `ciutatis onboard`

Interactive first-time setup:

```sh
pnpm ciutatis onboard
```

First prompt:

1. `Quickstart` (recommended): local defaults (embedded database, no LLM provider, local disk storage, default secrets)
2. `Advanced setup`: full interactive configuration

Start immediately after onboarding:

```sh
pnpm ciutatis onboard --run
```

Non-interactive defaults + immediate start (opens browser on server listen):

```sh
pnpm ciutatis onboard --yes
```

## `ciutatis doctor`

Health checks with optional auto-repair:

```sh
pnpm ciutatis doctor
pnpm ciutatis doctor --repair
```

Validates:

- Server configuration
- Database connectivity
- Secrets adapter configuration
- Storage configuration
- Missing key files

## `ciutatis configure`

Update configuration sections:

```sh
pnpm ciutatis configure --section server
pnpm ciutatis configure --section secrets
pnpm ciutatis configure --section storage
```

## `ciutatis env`

Show resolved environment configuration:

```sh
pnpm ciutatis env
```

## `ciutatis allowed-hostname`

Allow a private hostname for authenticated/private mode:

```sh
pnpm ciutatis allowed-hostname my-tailscale-host
```

## Local Storage Paths

| Data | Default Path |
|------|-------------|
| Config | `~/.paperclip/instances/default/config.json` |
| Database | `~/.paperclip/instances/default/db` |
| Logs | `~/.paperclip/instances/default/logs` |
| Storage | `~/.paperclip/instances/default/data/storage` |
| Secrets key | `~/.paperclip/instances/default/secrets/master.key` |

Override with:

```sh
PAPERCLIP_HOME=/custom/home PAPERCLIP_INSTANCE_ID=dev pnpm ciutatis run
```

Or pass `--data-dir` directly on any command:

```sh
pnpm ciutatis run --data-dir ./tmp/paperclip-dev
pnpm ciutatis doctor --data-dir ./tmp/paperclip-dev
```
