---
name: Darbar Restaurant — storage backend & data seeding
description: Which storage backend this project uses for images, and how to seed/write menu data given Clerk-protected write routes.
---

## Storage backend
- This project uses **Supabase Storage** directly (bucket `menu-images`, configurable via `SUPABASE_STORAGE_BUCKET`), not Replit's App Storage/GCS skill. Do not set up the object-storage skill here — it would be the wrong backend.
- Requires secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. If unset, `artifacts/api-server/src/routes/upload.ts` uploads fail. The bucket itself is not auto-created — create it once with `supabase.storage.createBucket(name, { public: true })` if missing.

## Seeding menu data
- `POST/PATCH/DELETE /api/menu/items` are behind Clerk `requireAuth` — cannot be called with plain unauthenticated `fetch` from a script/agent context.
- For one-off seeding, insert directly into Postgres via `executeSql` (categories/menu_items tables) instead of hitting the API. Reads (`GET /api/menu/items`, `/api/menu/categories`) are public and fine for verification.
