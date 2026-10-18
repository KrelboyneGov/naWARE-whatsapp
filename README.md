# KlAimate

KlAimate is the visible name of this app: a district rain and natural-event view for Peru, plus
WhatsApp alerts. The package scope stays `@emergency-map`. The map still shows official warnings,
reported emergencies and available help. Product context: [`docs/product-brief.md`](./docs/product-brief.md).
WhatsApp flow, webhook and env vars: [`docs/whatsapp.md`](./docs/whatsapp.md).

Monorepo scaffolded from [monorepo-template](https://github.com/niway-dev/monorepo-template)
(Client-Server Hono pattern): TypeScript, pnpm, Turborepo, DDD + Hexagonal Architecture.
The template is Bun-native; this repository switched to pnpm ([ADR 0002](./docs/adr/0002-pnpm-and-mise.md)).

## Stack

| Layer    | Technology                                           |
| -------- | ---------------------------------------------------- |
| Web      | TanStack Start, TanStack Router + Query, React       |
| API      | Hono + oRPC (OpenAPI), Better Auth                   |
| Runtime  | Cloudflare Workers (Wrangler), Service Binding proxy |
| Database | Neon PostgreSQL, Drizzle ORM                         |
| UI       | shadcn/ui, Tailwind CSS (`packages/web-ui`)          |
| Tooling  | oxlint, oxfmt, Lefthook, Vitest                      |

## Getting started

Toolchain versions (Node, pnpm) are pinned in `mise.toml`; [mise](https://mise.jdx.dev) installs
them locally and in CI from the same file.

```bash
mise install
pnpm install
# apps/server-hono/.env  -> DATABASE_URL, DATABASE_URL_DIRECT, BETTER_AUTH_SECRET, CORS_ORIGIN
# apps/web-hono/.env     -> VITE_SERVER_URL (http://localhost:3000 in dev)
pnpm run db:push   # local iteration; commit schema changes with db:generate
pnpm run dev       # API on :3000, web on :3001
```

Copy each app's `.env.example` to `.env` if it does not exist yet.

## WhatsApp

Inbound messages hit `POST /api/v1/webhooks/zavu`. In the Zavu dashboard open **Senders → Achalau HCO**
(the WhatsApp sender; the default sender is SMS-only) → **Webhooks** → event `message.inbound`, and
set the URL to `https://<api-host>/api/v1/webhooks/zavu`. Put that sender's signing secret in
`ZAVU_WEBHOOK_SECRET`.

Every send sets `Zavu-Sender` from `ZAVU_SENDER_ID` (`kd7b3sknk6z3xvn5pykzgkc7a58ghwe7`) and
`channel=whatsapp`. `ZAVU_CAN_SEND_TEMPLATES` stays false until the sender's payment setup allows
templates; those jobs are recorded once and not retried. Copy `apps/server-hono/.env.example`.
Do not commit API keys or the business phone number.

`pnpm run whatsapp:templates` prints the utility catalog and does not call Zavu. Add `-- --submit`
only when the key and sender id are set.

## Apps and packages

```
apps/
├── web-hono/      # TanStack Start web app (proxy client, Cloudflare Worker)
└── server-hono/   # Hono + oRPC API (Cloudflare Worker `server-hono-api`)
packages/
├── domain/            # Zod schemas, types, repository interfaces (no deps)
├── application/       # Use cases (depend only on domain)
├── infra-db/          # Drizzle schema, repositories, mappers, Neon client, migrations
├── infra-auth/        # Better Auth base config
├── infra-cloudflare/  # Service Binding fetch + proxy handler
├── infra-env/         # Zod env schemas per app
├── infra-messaging/   # Zavu WhatsApp adapter, OpenAI-compatible LLM, Open-Meteo
├── web-ui/            # Shared React UI (built to dist/)
└── config/            # Shared tsconfig
```

Dependency rule: `domain <- application <- infra-*`; only apps wire them together.

## Scripts

- `pnpm run dev` — both apps · `dev:server-hono` / `dev:web-hono` — one app
- `pnpm run verify` — lint, format check, package builds, type-check, tests (pre-push runs it)
- `pnpm run build` · `check-types` · `test` · `lint` · `format`
- `pnpm run db:push` · `db:generate` · `db:migrate` · `db:studio`

## Deployment

Releases are cut by release-please and deploy both Workers, each gated by `verify`:

```bash
# Merge to main with Conventional Commits; release-please keeps a release PR open.
# Merging that PR tags vX.Y.Z and deploys the API, then the web (release-please.yml).
```

Required secrets, variables and first-deploy order: [`docs/deployment.md`](./docs/deployment.md).
Decision records: [`docs/adr/`](./docs/adr/).

## Documentation

- `docs/product-brief.md` — product, users, data sources, MVP scope
- `docs/deployment.md` — environments, secrets, release procedure
- `docs/adr/` — architecture decision records
- `CLAUDE.md` — working rules for AI agents and contributors
- `KNOWLEDGE.base/` — team decision matrix and context, a verified copy of Linear (the source of
  truth). AI assistants load the `naware-knowledge` skill (`AGENTS.md`): matrix changes need a
  before/after alert and human approval, and each session ends with a final review. Connect your
  assistant to the naWARE Linear workspace with your own account; never commit tokens.
