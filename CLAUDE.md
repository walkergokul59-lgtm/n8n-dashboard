# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**n8n Live Dashboard** — A React 19 SPA that displays real-time workflow execution data from n8n instances. The frontend connects to a Node.js backend server (`server/`) which securely proxies n8n API calls (credentials stay server-side).

## Commands

```bash
npm run dev      # Start Node server (port 5173) with Vite HMR in middleware mode
npm run dev:ui   # Vite dev server only (for UI-only work, no backend)
npm run build    # Production build → dist/ (Vite + serverless bundling)
npm run start    # Start Node server in production mode
npm run lint     # ESLint checks
npm run preview  # Serve production build locally (requires npm run build first)
```

**Development Workflow**:
- `npm run dev` — **Most common**. Node server auto-reloads on file changes, serves built assets
- `npm run dev:ui` — If you only work on React components and don't need backend (uses mock data by default)
- For quick UI iterations: Start `npm run dev`, then in Settings select `mockup` or `realtime-mockup` data mode

## Environment Setup

### Local Development (`.env`)

Create `.env` in the root with n8n connection details:
```
N8N_BASE_URL=http://localhost:5678        # Your local n8n instance URL
N8N_API_TOKEN=<your-n8n-api-token>        # n8n API token (from Settings → API)
N8N_API_BASE_PATH=/api/v1                 # Usually /api/v1
N8N_AUTH_TYPE=bearer                      # How n8n authenticates (bearer or header)
N8N_AUTH_HEADER=X-N8N-API-KEY             # Optional: custom auth header (if not bearer)
PORT=5173                                  # Optional: server port (default 5173)
```

In local dev, the Node server reads `.env` via `server/env.js` and uses it to proxy calls to n8n.

### Production (Vercel Environment Variables)

For Vercel deployment, set these in the Vercel dashboard (not in `.env`):
```
N8N_BASE_URL=https://n8n.yourdomain.com   # Production n8n URL
N8N_API_TOKEN=<your-n8n-api-token>        # n8n API token
N8N_API_BASE_PATH=/api/v1                 # Usually /api/v1
N8N_AUTH_TYPE=bearer                      # Auth method
KV_REST_API_URL=<vercel-kv-url>          # (optional) Vercel KV for persistent RBAC
KV_REST_API_TOKEN=<vercel-kv-token>      # (optional) Vercel KV token
RBAC_KV_KEY=n8n:rbac                      # (optional) KV key prefix (default: n8n:rbac)
```

**Important**: `.env` is local-only; Vercel functions use their own env vars. See README for more details.

## Architecture

### Deployment Modes

**Development**: Node.js server (`npm run dev`) runs on port 5173, integrating Vite HMR middleware for hot reloading. Node server is HTTP, no HTTPS in dev.

**Production**: Two options:
1. **Traditional**: `npm run start` (Node server in production mode)
2. **Vercel Serverless**: Deploys frontend + API routes (`api/`) as serverless functions

### Three-Tier: Frontend + Backend + n8n

**Frontend** (`src/`) — React 19 SPA using React Router v7 with Vite
**Backend** — N8n API proxy:
  - **Local dev**: Node.js server in `server/` (HTTP)
  - **Production**: Vercel serverless functions in `api/` for scaled deployment
**Data Source** — n8n instance (configurable via Settings page)

### Routing & Layout

`App.jsx` defines routes under shared `Layout` (`Sidebar` + `Header` + `<Outlet>`):
- `/` — Redirects to `/dashboard`
- `/dashboard` — Main dashboard (KPIs, recent executions, system health)
- `/agent-logs` — AI agent execution logs
- `/invoice-runs` — Invoice processing execution history
- `/order-sync` — Order synchronization status
- `/sms-outreach` — SMS campaign execution logs
- `/settings` — App configuration (data source mode, n8n instance URL)
- `/admin` — Admin panel (users, roles, workflow allowlists) — **admin-only**
- `/login` — Authentication page (shown if not logged in)

### Data Management

**Three modes** (via `SettingsContext`, `src/context/SettingsContext.jsx`):
1. `'mockup'` — Static mock data from `src/utils/mock-data.js`
2. `'realtime-mockup'` — Mock data with simulated real-time updates
3. `'n8n-server'` — Live data from n8n via backend proxy

Switch modes in Settings page. Data persists to `localStorage` as `n8nDataSource`.

To add real data integration: Update mock data generators or replace with API calls in page components. The server already exposes `/api/dashboard/*` endpoints for data fetching.

### Styling & Theme

Dark theme (cyan accent). Tailwind v4 with CSS variables in `src/index.css`:
- `--color-background: #0f1419`
- `--color-foreground: #e0e0e0`
- `--color-primary: #00d2d2`

No `tailwind.config.js` — uses `@tailwindcss/vite` plugin. Use `clsx` + `tailwind-merge` for conditional classes.

### Visual Components & Effects

- **Animations**: GSAP for smooth transitions (preloader, scroll)
- **Effect Layers**: `PixelBlast`, `LightPillar`, `ChromaGrid` (visual overlays)
- **Preloader**: Boot screen with font readiness check (min 900ms, waits for fonts)
- **Charts**: `recharts` (AreaChart, used in `ExecutionVolumeChart`)
- **Icons**: `lucide-react`

### State Management

**Global State**: Two context providers:
- **`SettingsContext`** (`src/context/SettingsContext.jsx`) — App-wide settings (data source mode, n8n URL, theme)
- **`AuthContext`** (`src/context/AuthContext.jsx`) — User token, login/logout, API fetch helper with auth headers

**Local State**: Component-level `useState` only. No Redux/Zustand.

**Data Fetching**: Pages use `AuthContext.apiFetch()` to make authenticated requests to `/api/` endpoints. Responses are parsed and rendered directly in component state (no cache layer).

### Common Development Tasks

**Add a new dashboard metric**:
1. Create data fetcher in page component (e.g., `Dashboard.jsx`)
2. Call `/api/dashboard/overview` via `AuthContext.apiFetch()`
3. Parse response and store in `useState`
4. Render with chart or component

**Add a new workflow execution page**:
1. Create `.jsx` file in `src/pages/`
2. Add route in `App.jsx`
3. Use `AuthContext.apiFetch('/api/dashboard/recent-executions?...)` to fetch data
4. Filter by workflow ID or status as needed

**Modify Admin panel user management**:
1. Edit `api/admin/rbac.js` (Vercel serverless) or `server/apiRouter.js` → admin handler
2. Update the RBAC store logic
3. Test with local RBAC store (`server/rbacStore.js`)
4. Deploy to Vercel (or update Vercel KV if persisted RBAC is enabled)

**Add a new n8n data field**:
1. Update n8n API client (`server/n8nClient.js`)
2. Update business logic (`server/dashboardCore.js`)
3. Update `/api/dashboard/*` endpoint to include the new field
4. Update React component to display it

### Authentication & RBAC

The app enforces **role-based access control (RBAC)** with two user roles:
- **`admin`** — Full access to all workflows and admin panel
- **`client`** — Access only to workflows explicitly mapped to them (via Admin panel)

**Key Files**:
- **`server/accessControl.js`** — Functions to check user permissions, get allowed workflow IDs
- **`server/tokenAuth.js`** — JWT token validation & extraction from requests
- **`server/rbacStore.js`** — In-memory (dev) or KV (Vercel) storage for user/client/workflow mappings
- **`src/context/AuthContext.jsx`** — Frontend auth state (token in localStorage as `n8nDashboardAuthToken`)

**Test Users** (in-memory RBAC, reset on server restart):
- Admin: `root@gmail.com` / `root`
- Client: `client1@gmail.com` / `client1`

**Vercel Persistence**: By default, RBAC is in-memory and resets on cold start. To persist admin changes (user/client mappings), wire `rbacStore.js` to Vercel KV (set `KV_REST_API_URL`, `KV_REST_API_TOKEN`).

### Server Details (`server/`)

- **index.js**: HTTP server, Vite middleware integration, static file serving
- **n8nClient.js**: n8n API client (auth, request building, error handling)
- **apiRouter.js**: Request routing to dashboard/auth/admin endpoints
- **dashboardCore.js**: Business logic (workflow queries, execution logs, health checks)
- **env.js**: Environment variable loader
- **accessControl.js**: RBAC utility functions (user lookup, permission checks)
- **tokenAuth.js**: JWT token validation middleware
- **rbacStore.js**: User/client/workflow mapping storage (in-memory or KV)
- **httpUtils.js**: HTTP response helpers

### Vercel Serverless Functions (`api/`)

Production deployment uses Vercel serverless functions instead of Node server:

- **`api/auth/login.js`** — User authentication endpoint
- **`api/auth/me.js`** — Current user info endpoint
- **`api/dashboard/workflows.js`** — Fetch workflows (respects RBAC)
- **`api/dashboard/overview.js`** — Dashboard KPIs (respects RBAC)
- **`api/dashboard/recent-executions.js`** — Execution history (respects RBAC)
- **`api/dashboard/health.js`** — System health check
- **`api/dashboard/stream.js`** — Real-time execution updates
- **`api/admin/rbac.js`** — Admin panel: user/client/workflow management
- **`api/_lib/auth.js`** — Shared auth logic (JWT, RBAC)
- **`api/dashboard/_client.js`** — Shared n8n client utilities

These functions handle the same logic as `server/` but in serverless context. They require Vercel environment variables (set in Vercel dashboard): `N8N_BASE_URL`, `N8N_API_TOKEN`, `N8N_API_BASE_PATH`, etc.

## Development Workflow

### Local Development with Auth

1. **Start the server**: `npm run dev`
2. **App opens** at `http://localhost:5173` → redirects to `/login` (auth required)
3. **Login**:
   - Admin: `root@gmail.com` / `root`
   - Client: `client1@gmail.com` / `client1`
4. **Navigate to `/settings`**: Choose n8n data source mode
5. **For Admin tasks**: Navigate to `/admin` to manage users/clients/workflow allowlists

### Admin Panel (`/admin`)

Admin-only page for user and client management:
- **Create/edit users**: Email, password, role (`admin` or `client`)
- **Manage clients**: Assign workflow IDs to clients (allowlist)
- **Verify access**: Check which workflows a client can see in their dashboard

Changes are stored in RBAC store (in-memory in dev, Vercel KV in production).

### Testing Different User Roles

**Local testing**: Edit `server/rbacStore.js` or use the Admin panel to create test users/clients with specific workflow allowlists.

**Example**: To test a client with only workflow `123`:
1. Log in as `root` (admin)
2. Go to `/admin`
3. Ensure there's a client entry with `workflowIds: ['123']`
4. Create a user with that `clientId` and role `client`
5. Log out, then log in with the new client account
6. Verify only workflow `123` appears in dashboard

### Testing in Different Data Modes

In **Settings**, switch between:
- **`mockup`** — Static mock data (fastest, no n8n needed)
- **`realtime-mockup`** — Mock data with simulated real-time updates
- **`n8n-server`** — Live data from your n8n instance (requires `N8N_BASE_URL`, `N8N_API_TOKEN`)
