# workers/api

Cloudflare Workers API for Ciutatis.

## Local Development

Copy the example env file and fill in real values:

```sh
cp .env.example .dev.vars
# edit .dev.vars with your local credentials
```

Then run:

```sh
wrangler dev
```

`.dev.vars` is loaded automatically by `wrangler dev` and is gitignored — never commit it.

## Configuration

Plain-text variables are defined in `wrangler.toml` under `[vars]` and are safe to commit.

| Variable | Values | Purpose |
|---|---|---|
| `DEPLOYMENT_MODE` | `local_trusted` / `authenticated` | Auth mode. Use `local_trusted` for local dev; `authenticated` requires Better Auth. |
| `AUTH_DISABLE_SIGNUP` | `true` / `false` | Disables new user registration in authenticated mode. |

## Secrets

Secrets are encrypted by Cloudflare and must **never** be stored in `wrangler.toml` or committed to git.
Set them with `wrangler secret put`:

### BETTER_AUTH_SECRET

Required when `DEPLOYMENT_MODE=authenticated`. Signs and verifies auth sessions.

Generate a secure value:

```sh
openssl rand -hex 32
```

Set in Cloudflare:

```sh
wrangler secret put BETTER_AUTH_SECRET
# paste the generated value when prompted
```

### R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY

Credentials for the R2 bucket used for asset storage.

```sh
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

## Deployment

```sh
wrangler deploy
```

See [doc/DEPLOYMENT-MODES.md](../../doc/DEPLOYMENT-MODES.md) for full deployment mode documentation.
