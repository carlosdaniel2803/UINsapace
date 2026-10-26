# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

UIN Space — university space management system: room reservations, room equipment, and incident reports ("reportes de anomalías"), gated by a role/permission model.

Two independent npm packages in one repo:

- **Root** — frontend: React 19 + Vite 8 + react-router-dom 7. JavaScript (no TypeScript).
- **`backend/`** — API: Express 4 + PostgreSQL (`pg`), JWT auth, bcrypt.

## Commands

Dependencies are not installed yet in either package — run `npm install` in `backend/` and at the root.

```bash
# Frontend (root) — dev server on http://localhost:5173
npm run dev
npm run build          # production build to dist/
npm run lint           # eslint (flat config, react-hooks + react-refresh)
npm run preview

# Backend (backend/) — API on http://localhost:3001
cd backend
npm run dev            # node --watch src/server.js
npm start
```

No test runner is configured in either package. Do not assume `npm test` works.

## Database setup

Schema lives at `backend/src/database/uin_space.sql` (single authoritative file — it creates tables, types, triggers, roles, permissions, and seed data). `backend/src/database/migrations/` holds idempotent patches for databases created before a schema change; apply them with `psql "$DATABASE_URL" -f`.

```bash
psql "$DATABASE_URL" -f backend/src/database/uin_space.sql
cp backend/.env.example backend/.env   # then set DATABASE_URL and JWT_SECRET
```

Backend env vars (`backend/.env`): `PORT`, `DATABASE_URL`, `DATABASE_SSL`, `JWT_SECRET`, `CLIENT_URL`.
Frontend env var: `VITE_API_URL` (defaults to `http://localhost:3001/api`).

`CLIENT_URL` is the comma-separated allowlist of origins allowed by CORS (e.g. `https://app.vercel.app`). When unset, the server falls back to the localhost dev origins.

## Architecture

### Auth and request flow

1. `src/api.js` is the single HTTP entry point for the frontend. It attaches `Authorization: Bearer <token>` from `localStorage.token` to every request and throws `Error(data.error)` on non-2xx. All backend error messages are user-facing Spanish strings. On any 401 it clears the token and dispatches the `auth:unauthorized` window event.
2. `src/context/AuthContext.jsx` holds `user`, `loading`, `login`, `logout`, and `can(permission)`. On mount it calls `/auth/me` if a token exists and drops the token if that call fails. It also listens for `auth:unauthorized`, so an expired session closes the app-wide, not just the screen that made the request. `login` stores the JWT, then re-fetches `/auth/me` to populate `user` (including the `permissions` array).
3. `src/components/ProtectedRoute.jsx` wraps protected routes. Props: `permission="reports.create"` — optional; without it only authentication is required. It redirects to `/` when logged out and to `/inicio` when the permission check fails.
4. Routes are declared in `src/App.jsx`. `/` is the login/register screen (`AuthContainer`), `/inicio` is the logged-in home.

`src/pages/Home.jsx` filters its action buttons by permission through `can(...)`, so the menu mirrors the RBAC model. Permission codes used in the frontend must match `permissions.code` in the SQL seed exactly.

### Backend layout

- `backend/src/server.js` — app wiring, CORS allowlist from `CLIENT_URL`, helmet, JSON body parsing, `/api/health`, mounts the routers, generic error handler that maps Postgres error codes (`22001`, `22P02`, `23503`, `23505`, `23P01`…) to 400/409 and everything else to 500. `P0001` (a `RAISE EXCEPTION` from a protection trigger) is answered with 403 and the trigger message. Handles `SIGTERM`/`SIGINT` to close the HTTP server and the pool.
- `backend/src/db.js` — exported `pg` pool and the `query(text, params)` helper. **Always use `query` with `$1` placeholders** — no string interpolation of user input. The pool has short timeouts and an `error` listener (without it, an idle client dropped by a serverless Postgres crashes Node).
- `backend/src/routes/auth.js` — `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`. JWT is signed with `{ sub: userId }` and expires in 8h. Public registration always inserts the `docente` role; other roles are assigned by an administrator. Login always runs `bcrypt.compare` (against a dummy hash when the email is unknown) so response time does not reveal which emails are registered.
- `backend/src/middleware/auth.js` — `authenticate` is a global middleware: it parses `Authorization: Bearer <token>` (`extractBearerToken`), verifies the JWT, loads the user + role + permissions into `req.user`, and answers 401 otherwise. `PUBLIC_PATHS` lists the routes it skips (`/api/health`, `/api/auth/login`, `/api/auth/register`). `requireAuth` is only a guard (`if (!req.user)`) — the user is already loaded by `authenticate`. `requirePermission(code)` returns 403 when the code is absent.
- `backend/src/middleware/rateLimit.js` — `loginLimiter` (10 / 15 min) and `registerLimiter` (5 / hour) per IP. `app.set("trust proxy", 1)` is required for the real client IP behind a proxy.
- `backend/src/utils/validate.js` — `asString(value)` returns the value as a string or `""`. Use it on every request body field before calling string methods, otherwise a non-string body crashes the handler with a 500.
- `backend/src/routes/roles.js` — role and permission management, all behind `roles.manage`: `GET /api/roles`, `GET /api/roles/permissions`, `POST /api/roles/permissions`, `PATCH|DELETE /api/roles/permissions/:id`, `GET /api/roles/:id`, `POST /api/roles`, `PUT /api/roles/:id` (rename; never changes `code`), `PUT /api/roles/:id/permissions` (atomic replace of the role's permission list), `DELETE /api/roles/:id`. System roles (`administrador`, `mantenimiento`) cannot be renamed or deleted, and the `administrador` permissions cannot be edited at all.

New route groups should follow the same shape: a router in `backend/src/routes/`, mounted in `server.js`, with `requireAuth` / `requirePermission` in the middleware.

### Data model notes

The schema carries deliberate guarantees — preserve them when writing queries:

- `reservations_no_overlap`: `EXCLUDE USING gist` constraint blocks two confirmed reservations for the same room that overlap in time.
- `user_permissions` view: effective permissions per active user, resolved through the user's role.
- `room_occupancy` view: busy slots without who booked them (the calendar intentionally hides booking identity).
- `has_permission(user_id, code)` SQL function.
- Triggers: `updated_at` auto-set, `resolved_at` set when a report reaches `resuelto`, new permissions auto-granted to the `administrador` role, system roles and admin permissions protected from deletion, base permissions protected from deletion and renaming.
- `roles.is_system` marks the two immutable roles (`administrador`, `mantenimiento`); every other role can be renamed and deleted once it has no users.
- `permissions.is_system` marks the base catalog: it can only have its description edited, never be renamed or deleted.

Roles seeded: `docente`, `administrador`, `directora`, `mantenimiento`, `prefectura`. Only `administrador` and `mantenimiento` are system roles.

## Frontend conventions

- `src/components/ui/` holds the primitive components: `Card`, `Button`, `FormField` (input or `as="select"`), `Alert`, `SwitchLink`. Each has a sibling `.css` file imported by the component.
- Design tokens (colors, gradients, radii, font) live in `src/styles/global.css` under `:root`. Component styles reference the tokens; component CSS never redefines raw palette values.
- `src/components/AuthContainer.jsx` toggles between `Login` and `Register` with local state — no route change between them.
- UI copy, error messages, and code comments are in Spanish. Identifiers stay in English.

## Conventions

- Comments explain *why*, not *what*. The codebase writes them in Spanish — match that.
- Templates hold no logic: extract to functions or constants outside the component (see `SECTIONS` in `Home.jsx`).
- No `console.log` in committed code; the backend's error handler uses `console.error`.
- Conventional Commits. Branch from `develop` with `feature/*`, `fix/*`, `chore/*`; PRs target `develop`; `main` is production. Never push directly to `main`.
