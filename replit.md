# Darbar Multi-Cuisine Restaurant

A full-stack restaurant website for **Darbar Multi-Cuisine Restaurant** in Kurnool, Andhra Pradesh.

## Stack

- **Frontend** (`artifacts/darbar-restaurant`): React + Vite + Tailwind CSS + Framer Motion + shadcn/ui
- **API server** (`artifacts/api-server`): Express.js + Pino logging, serves under `/api`
- **Database** (`lib/db`): PostgreSQL via Drizzle ORM
- **Shared libs**: `lib/api-spec` (OpenAPI), `lib/api-zod` (Zod schemas), `lib/api-client-react` (React Query hooks)

## Running the project

Dependencies are managed with pnpm. To install:

```bash
pnpm install
```

The workspace has three configured workflows that run automatically:

| Workflow | What it does |
|---|---|
| `artifacts/darbar-restaurant: web` | Vite dev server for the React frontend |
| `artifacts/api-server: API Server` | Express API (builds then starts) |
| `artifacts/mockup-sandbox: Component Preview Server` | Design canvas sandbox (used by Replit Canvas) |

## Database

The project uses Replit's built-in PostgreSQL database. The `DATABASE_URL` environment variable is set automatically.

To push schema changes to the database:

```bash
pnpm --filter @workspace/db run push
```

## Environment variables / secrets

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Auto-set by Replit's database |
| `SESSION_SECRET` | Yes | Set in Replit Secrets |

## User preferences

<!-- Add any preferences here -->
