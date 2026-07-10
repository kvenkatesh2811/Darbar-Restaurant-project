---
name: Clerk Auth — Darbar Restaurant
description: How Clerk authentication is wired into the darbar-restaurant + api-server monorepo, and key decisions that must be respected in future work.
---

## Setup
- Clerk is **Replit-managed** (white-label). Provisioned via `setupClerkWhitelabelAuth()`. Do NOT send user to dashboard.clerk.com.
- Secrets in use: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`.
- `VITE_CLERK_PROXY_URL` is set by Replit in production; intentionally empty in dev.

## Frontend (darbar-restaurant)
- `App.tsx`: `WouterRouter base={basePath}` wraps everything; `ClerkProvider` is INSIDE the router so `useLocation` works for `routerPush`/`routerReplace`.
- `publishableKeyFromHost` from `@clerk/react/internal` — do NOT inline the env var directly into `publishableKey`.
- `stripBase(path)` helper strips the basePath prefix before passing to wouter's `setLocation` (Clerk passes full paths; wouter prepends base).
- Sign-up is intentionally disabled (`signUpUrl` → `/sign-in` in both `ClerkProvider` and `SignIn.tsx`).
- Tailwind v4 requires: `tailwindcss({ optimize: false })` in vite.config, and `@layer theme, base, clerk, components, utilities` BEFORE `@import "tailwindcss"` in index.css, plus `@import '@clerk/themes/shadcn.css'` after.
- Clerk appearance uses `cssLayerName: "clerk"` and `theme: shadcn` from `@clerk/themes`.

## Backend (api-server)
- `clerkProxyMiddleware()` must be mounted BEFORE body parsers (it streams raw bytes).
- `clerkMiddleware()` with `publishableKeyFromHost` resolves the key dynamically.
- `requireAuth` (`middlewares/requireAuth.ts`): checks Clerk session + optionally enforces email allowlist via `ADMIN_EMAILS` env var (comma-separated). If `ADMIN_EMAILS` is not set, any authenticated Clerk user is allowed — owner should set it after first sign-in.
- Protected paths in `app.ts`: `/api/admin/*`, `/api/stats/*`, `GET /api/leads|feedback|orders`, `PATCH /api/orders`, non-GET `/api/menu/items`, write ops on `/api/specials`.

## Admin UX
- Admin link is always visible in Navbar (public) — the Admin page itself shows a sign-in prompt for unauthenticated users (`<Show when="signed-in/out">` from `@clerk/react`).
- Clicking Admin → unauthenticated → shows sign-in CTA with link to `/sign-in`.
- Clerk `<SignIn>` at `/sign-in/*?` with `fallbackRedirectUrl` pointing to `/admin`.
- Sign-out: `useClerk().signOut({ redirectUrl: "/" })` in AdminPanel.

**Why:** The `/*?` wildcard on `/sign-in/*?` in Wouter is required — Clerk uses sub-paths for OAuth callbacks and MFA steps.
