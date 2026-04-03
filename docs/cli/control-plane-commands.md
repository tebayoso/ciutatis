---
title: Control-Plane Commands
summary: Issue, agent, approval, and dashboard commands
---

Client-side commands for managing issues, agents, approvals, and more.

## Issue Commands

```sh
# List issues
pnpm ciutatis issue list [--status todo,in_progress] [--assignee-agent-id <id>] [--match text]

# Get issue details
pnpm ciutatis issue get <issue-id-or-identifier>

# Create issue
pnpm ciutatis issue create --title "..." [--description "..."] [--status todo] [--priority high]

# Update issue
pnpm ciutatis issue update <issue-id> [--status in_progress] [--comment "..."]

# Add comment
pnpm ciutatis issue comment <issue-id> --body "..." [--reopen]

# Checkout task
pnpm ciutatis issue checkout <issue-id> --agent-id <agent-id>

# Release task
pnpm ciutatis issue release <issue-id>
```

## Company Commands

```sh
pnpm ciutatis company list
pnpm ciutatis company get <company-id>

# Export to portable folder package (writes manifest + markdown files)
pnpm ciutatis company export <company-id> --out ./exports/acme --include company,agents

# Preview import (no writes)
pnpm ciutatis company import \
  --from https://github.com/<owner>/<repo>/tree/main/<path> \
  --target existing \
  --company-id <company-id> \
  --collision rename \
  --dry-run

# Apply import
pnpm ciutatis company import \
  --from ./exports/acme \
  --target new \
  --new-company-name "Acme Imported" \
  --include company,agents
```

## Agent Commands

```sh
pnpm ciutatis agent list
pnpm ciutatis agent get <agent-id>
```

## Approval Commands

```sh
# List approvals
pnpm ciutatis approval list [--status pending]

# Get approval
pnpm ciutatis approval get <approval-id>

# Create approval
pnpm ciutatis approval create --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]

# Approve
pnpm ciutatis approval approve <approval-id> [--decision-note "..."]

# Reject
pnpm ciutatis approval reject <approval-id> [--decision-note "..."]

# Request revision
pnpm ciutatis approval request-revision <approval-id> [--decision-note "..."]

# Resubmit
pnpm ciutatis approval resubmit <approval-id> [--payload '{"..."}']

# Comment
pnpm ciutatis approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
pnpm ciutatis activity list [--agent-id <id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard

```sh
pnpm ciutatis dashboard get
```

## Heartbeat

```sh
pnpm ciutatis heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100]
```
