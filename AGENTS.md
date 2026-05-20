# AGENTS.md

## Registry — critical, do this first

pnpm is configured user-wide to use a Porsche Informatik Artifactory registry. This project overrides it via `.npmrc`:

```
registry=https://registry.npmjs.org/
```

Without `.npmrc` present, `pnpm install` will 404 on every public package.

## Dev commands

```bash
pnpm install          # install deps
pnpm dev              # vite dev server on :3000 (falls back to :3001 if busy)
pnpm build            # production build → .output/
pnpm test             # vitest run (non-watch)
pnpm exec tsc --noEmit  # typecheck (no tsc script in package.json)
```

Database (requires Docker):
```bash
docker compose up -d  # start Postgres 18 on :5432 (user: app, password: password, db: app)
pnpm db:push          # push Drizzle schema changes to DB (no migration files generated)
pnpm db:generate      # generate migration files if switching to migration-based flow
pnpm db:studio        # Drizzle Studio UI
```

## Environment

Copy secrets to `.env.local` (gitignored). Required variables:

```
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://app:password@localhost:5432/app
MICROSOFT_TENANT_ID=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

`drizzle.config.ts` and `src/db/index.ts` both load from `.env.local` via dotenv. The dev server does too via Vite.

## Architecture

- **Framework**: TanStack Start (React, SSR) + Vite 8 + Nitro
- **Routing**: TanStack Router file-based — files in `src/routes/`, auto-generates `src/routeTree.gen.ts`. Never edit `routeTree.gen.ts` manually.
- **Database**: Drizzle ORM + PostgreSQL via `node-postgres` driver. Schema lives in `src/db/schema.ts`. Run `pnpm db:push` after schema changes.
- **Auth**: Better Auth with Microsoft Entra ID (social provider). Auth handler at `src/routes/api/auth/$.ts`. Server config at `src/lib/auth.ts`, client at `src/lib/auth-client.ts`.
- **Deployment target**: Azure Static Web Apps via custom Nitro preset in `nitro/`.

## Server functions

Use `createServerFn` from `@tanstack/react-start`. Access the current request inside a handler via `getRequest()` from `@tanstack/react-start/server`. Use `.inputValidator()` (not `.validator()`) for typed input.

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

export const myFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const req = getRequest()  // access cookies/headers for auth
    // ...
  })
```

## Auth in server functions

```ts
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'

const session = await auth.api.getSession({ headers: getRequest().headers })
if (!session?.user) throw new Error('Unauthorized')
```

## pnpm quirks

- `pnpm.onlyBuiltDependencies` must live in `pnpm.toml`, not `package.json` (pnpm 11+).
- After fresh install, run `pnpm approve-builds --all` to allow esbuild postinstall scripts.
- `pnpm-workspace.yaml` may get a `minimumReleaseAgeExclude` entry added automatically by pnpm — this is expected.

## Schema changes checklist

1. Edit `src/db/schema.ts`
2. `pnpm db:push` (pushes directly; no migration files)
3. If adding Better Auth tables: `echo y | pnpm dlx @better-auth/cli generate --config src/lib/auth.ts --output src/db/schema.ts`

## Microsoft Entra ID callback URL

When registering or updating the Azure app, the redirect URI must be:
`http://localhost:3000/api/auth/callback/microsoft` (dev)
`https://<your-domain>/api/auth/callback/microsoft` (prod)
