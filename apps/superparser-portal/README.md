# Superparser Portal

Standalone civic operations console for the Superparser hackathon demo.

## Run

```sh
pnpm --filter @ciutatis/superparser-portal dev
```

The console defaults to `http://localhost:8080` for the service URL. It also has an
offline demo mode so reviewers can inspect the flow before the service is running.

## Build

```sh
pnpm --filter @ciutatis/superparser-portal build
```

The build copies static assets to `apps/superparser-portal/dist`.
