# Rollback Plan

This document outlines the procedures for reverting Ciutatis to a stable state in the event of deployment failures, data corruption, or emergency situations.

## 1. Reverting Deployment Mode

If the `authenticated` mode fails (e.g., Better Auth configuration issues, session errors, or unintended lockouts), revert to `local_trusted` mode to restore immediate access.

### Procedure

1.  **Edit Configuration**: Open `workers/api/wrangler.toml`.
2.  **Change Mode**: Set `DEPLOYMENT_MODE` to `"local_trusted"`.
    ```toml
    [vars]
    DEPLOYMENT_MODE = "local_trusted"
    ```
3.  **Deploy**:
    ```bash
    wrangler deploy
    ```
4.  **Verify**: Access `/api/health` and confirm it returns `{"status":"ok","mode":"local_trusted"}`.

## 2. Emergency Session Clearing

If users are experiencing session corruption or stale authentication state that prevents login.

### Procedure

1.  **Clear KV Cache**: Delete the contents of the `CIUTATIS_SESSIONS` namespace.
    ```bash
    # Note: Replace <namespace_id> with ab19e1c5abe54868a89462c46570cad1
    # To delete all keys in the namespace:
    wrangler kv namespace delete --binding CIUTATIS_SESSIONS
    # Then recreate it if necessary (though usually better to just clear keys)
    ```
    *Note: Clearing the KV namespace forces all users to re-authenticate against the D1 source of truth.*

## 3. Database Recovery

### Scenario A: Minor Data Corruption / Reset
If the database state is invalid but schema is intact, re-running the seed can restore a known good state.

```bash
# Run the seed-runner (specific path depends on your local setup/package scripts)
pnpm -C packages/db-cloudflare run seed
```

### Scenario B: Full Database Reset (D1)
If the database is unrecoverable, reset and re-seed.

1.  **Reset Local D1** (Development):
    ```bash
    rm -rf .wrangler/state/v3/d1/
    pnpm dev
    ```

2.  **Reset Remote D1**:
    *Warning: This is destructive.*
    ```bash
    # Currently, D1 does not have a one-command "truncate all". 
    # You may need to delete and recreate the database or manually drop tables.
    wrangler d1 execute ciutatis-db --command "DROP TABLE ...;"
    # Then re-apply migrations and seed
    wrangler d1 migrations apply ciutatis-db --remote
    ```

### Manual Backup (Export)
Remote D1 does not have automatic scheduled backups in this configuration. Perform manual exports before risky operations:
```bash
wrangler d1 export ciutatis-db --remote --output ./backup.sql
```

## 4. Decision Tree: Rollback vs. Fix Forward

| Situation | Action | Rationale |
| :--- | :--- | :--- |
| **Critical Auth Failure** | **Rollback** | Blocks all institutional operations. Reverting to `local_trusted` restores control plane access. |
| **Data Corruption** | **Rollback** | Prevents further invalid state propagation. Restore from seed/backup. |
| **Minor UI Bug** | **Fix Forward** | Low impact on core operations. |
| **Non-critical API Error** | **Fix Forward** | If a workaround exists, fix in next deployment. |
| **Accidental Signup Enabled** | **Config Change** | Set `AUTH_DISABLE_SIGNUP="true"` and redeploy immediately. |

## 5. Quick Reference Commands

| Operation | Command |
| :--- | :--- |
| **Deploy API** | `wrangler deploy` |
| **Execute SQL** | `wrangler d1 execute ciutatis-db --remote --command "SELECT 1;"` |
| **View Logs** | `wrangler tail` |
| **Check Health** | `curl https://ciutatis.com/api/health` |

## 6. Emergency Contacts

- **Technical Lead**: Jorge (jorge@pox.me)
- **Infrastructure**: Cloudflare Dashboard (dash.cloudflare.com)
