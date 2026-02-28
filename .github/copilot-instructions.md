# Workshop Management App (Atelier OS)
This repository is a **Next.js 14** application used internally to manage a jewelry workshop. It is organized around the `app/` directory with a handful of feature areas (workshop scanner, order entry, admin dashboard, analytics, casting). Authentication and persistence are backed by **Supabase**.

## Big picture

1. **Next.js / App Router**
   - `app/layout.js` provides the global shell.
   - `(auth)` subtree holds login UI.
   - `(protected)` subtree contains all authenticated pages; middleware enforces auth.
   - Client components (`'use client'`) live inside these folders; shared presentational pieces go under `components/`.
   - Business logic lives in custom hooks adjacent to the page that uses them (e.g. `useWorkshopState.js`, `useAdminState.js`, `useOrderForm.js`, `useAnalytics.js`).

2. **Supabase**
   - Two clients: `lib/supabaseClient.js` (browser) and `lib/supabaseServer.js` (server/middleware).
   - Tables used are `orders` and `production_logs`. New features should add appropriate selects/inserts to the existing hooks.
   - Auth is handled via Supabase; `lib/auth.js` exposes `signIn`/`signUp` server actions used by the login form.
   - Environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required and validated at startup.
   - Middleware (`middleware.js`) intercepts every request (except static assets) and redirects unauthenticated users to `/login`; it also prevents logged‑in users from hitting `/login`.
   - Client-side auth helper `components/AuthProvider.jsx` exposes `{ user, loading, signOut }` via context.

3. **UI & state patterns**
   - TailwindCSS for styling; global styles in `app/globals.css`.
   - `@/` path alias from `jsconfig.json` used everywhere.
   - Pages are thin render layers; hooks encapsulate all network calls + derived state.
   - Optimistic updates are common (e.g. workshop timer/scan flow) with quick local state changes followed by Supabase writes.
   - Some utility constants are in `lib/constants.js` or within feature folders (e.g. `STAGES`, `STAFF_MEMBERS`, `KANBAN_COLUMNS`, `INITIAL_FORM`).
   - Scanner logic: `html5-qrcode` for camera reads and simple manual input fallback.
   - `printQRCode` opens a popup and injects a lightweight CDN QR library; called only on user interaction so it isn't bundled.

4. **Feature modules**
   - **Workshop** (`app/(protected)/workshop`): scanning, timers, stage transitions, cooldown logic, external/internal toggle, manual overrides. See `useWorkshopState.js` for full workflow.
   - **Admin** (`app/(protected)/admin`): live kanban board, audit log, archive search. `useAdminState.js` holds the queries and derived maps.
   - **Order entry** (`app/(protected)/order-entry`): controlled form with `useOrderForm.js`; successful submission shows a printable label via `OrderLabel`.
   - **Analytics** (`app/(protected)/analytics`): derives KPIs client‑side from orders & logs.
   - **Casting** (`app/(protected)/casting`): simple queue of jobs at casting stage with an approval button.

## Developer workflows

- **Development**: `npm run dev` (or yarn/pnpm/bun) starts Next dev server on port 3000.
- **Build / Production**: `npm run build` then `npm run start`; deploys on [Vercel](https://vercel.com) using `vercel.json` configuration.
- **Linting**: `npm run lint` (uses `eslint-config-next`). There are no unit tests; focus on manual testing in the browser.
- **Environment variables**: set the two SUPABASE variables in your `.env.local` or via the hosting platform.
- **Database migrations**: not in repo; the Supabase project already contains the schema. Inspect/modify via the Supabase dashboard.

## Conventions & patterns

- **File placement**: new features should mimic existing structure: a page component plus a `hooks/`, `components/`, and `constants/` subfolder as needed, all under `app/(protected)` or other relevant route group.
- **State hooks**: centralize state, fetching, derived values and handler functions there; pages just call the hook and render JSX. Keep hooks pure (no JSX) and client-only (`'use client'` at top of the page).
- **Supabase calls**: always check for `.error` and log or present a message. Prefer `async`/`await` with `try/catch` but it's acceptable to chain `.then()` like existing files.
- **Optimistic UI**: component state is often updated before the network call completes; follow patterns in `useWorkshopState` for timers and scanning.
- **Aliases**: import modules with `@/` rather than relative paths.
- **CSS**: tailwind classes are heavily used; avoid writing custom CSS unless absolutely necessary. Global color scheme handling is in `globals.css` with `colorScheme: 'light'` overrides when needed.
- **Accessibility**: error messages use `aria-live`, forms have proper labels, and spinner placeholders are provided during loading.

## External dependencies

- `@supabase/supabase-js` & `@supabase/ssr` for data/auth.
- `html5-qrcode` for scanning camera QR codes.
- `qrcode.react` and a CDN QR library for print labels.
- `lucide-react` for icons.
- TailwindCSS + the standard Next.js setup.

## Tips for AI agents

1. **Start by reading a hook** (e.g. `useWorkshopState.js`) to understand the business rules; most pages delegate logic there.
2. **Conform to existing folder layouts and naming** when adding new features. A matching hook+component pattern is expected.
3. **Supabase interactions** are the only network layer; mimic the simple `.from('table').select()/update()/insert()` patterns.
4. **Middleware** drives auth; any new public routes need to be added to the `isAuthRoute` check if they should bypass login.
5. **State & UI separation**: pages should remain small; any new derived data or mutations belong in hooks.
6. **Environment validation**: keep the check in `lib/supabaseClient.js` as-is when using these vars.

> ⚠️ There are no automated tests — verify behaviors manually in the browser. Also watch for hydration mismatches; many pages use a `mounted` flag to avoid FOUC.

Let me know if any areas are missing or unclear! I can iterate on these instructions.  