# Darbar Multi-Cuisine Restaurant

A premium, mobile-responsive restaurant website for Darbar Multi-Cuisine Restaurant in Kurnool, Andhra Pradesh — serving authentic Rayalaseema and multi-cuisine dishes.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, path /api)
- `pnpm --filter @workspace/darbar-restaurant run dev` — run the frontend (port 24045, path /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS, Framer Motion, wouter, shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI source of truth
- `lib/db/src/schema/` — Drizzle table definitions (categories, menu-items, specials, reviews, feedback, leads, orders)
- `artifacts/api-server/src/routes/` — Express route handlers (menu, specials, reviews, feedback, leads, orders, stats)
- `artifacts/darbar-restaurant/src/pages/` — Frontend pages (Home, Menu, Order, Admin)
- `artifacts/darbar-restaurant/src/components/` — Shared components (Navbar, Footer, FloatingWhatsApp, LeadPopup, ScrollToTop, ReviewModal)

## Architecture decisions

- OpenAPI-first: spec defines contracts, Orval generates React Query hooks (frontend) and Zod schemas (backend)
- Order items stored as JSONB in PostgreSQL for flexible cart data
- Menu items joined with categories table on categorySlug for category names
- Stats computed on-the-fly via SQL aggregations (no materialized views needed at this scale)
- Lead popup uses sessionStorage to show only once per browser session

## Product

- Homepage with hero, about, menu preview, today's specials, photo gallery, reviews, opening hours, Google Map, contact, footer
- Full menu page with category tabs, search, veg/non-veg filter, QR code for sharing
- Pre-order pickup page with item cart and customer details form
- Admin dashboard with stats, orders management, menu CRUD, leads, reviews, feedback

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `qrcode` package must be installed in `@workspace/darbar-restaurant` (already done)
- Menu items use `numeric` Drizzle type — always parse with `parseFloat()` before sending to client
- Order `items` column is JSONB typed as `Array<{menuItemId, menuItemName, quantity, price}>`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
