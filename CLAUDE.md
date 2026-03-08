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

Create `.env` in the root with n8n connection details and authentication settings:
```
# Google Sheets Database (optional — falls back to disk/memory without this)
GOOGLE_SERVICE_ACCOUNT_JSON=<base64-encoded service account JSON>
GOOGLE_SHEETS_SPREADSHEET_ID=<spreadsheet ID from URL>

# n8n connection
N8N_BASE_URL=http://localhost:5678        # Your local n8n instance URL
N8N_API_TOKEN=<your-n8n-api-token>        # n8n API token (from Settings → API)
N8N_API_BASE_PATH=/api/v1                 # Usually /api/v1
N8N_AUTH_TYPE=bearer                      # How n8n authenticates (bearer or header)
N8N_AUTH_HEADER=X-N8N-API-KEY             # Optional: custom auth header (if not bearer)

# Dashboard authentication
APP_AUTH_SECRET=<long-random-string>      # JWT secret for session tokens (required)

# Google OAuth (optional)
GOOGLE_CLIENT_ID=<your-google-client-id>  # OAuth client ID from Google Console
VITE_GOOGLE_CLIENT_ID=<same-as-above>     # Browser-side client ID (must match)

# Gmail SMTP (optional — for password reset & support ticket emails)
GMAIL_USER=your-email@gmail.com           # Gmail address
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx    # Gmail App Password (requires 2FA)

# Server settings
PORT=5173                                  # Optional: server port (default 5173)
```

In local dev, the Node server reads `.env` via `server/env.js` and uses it to proxy calls to n8n.

### Production (Vercel Environment Variables)

For Vercel deployment, set these in the Vercel dashboard (not in `.env`):
```
# Google Sheets Database
GOOGLE_SERVICE_ACCOUNT_JSON=<base64-encoded service account JSON>
GOOGLE_SHEETS_SPREADSHEET_ID=<spreadsheet ID from URL>

# n8n connection
N8N_BASE_URL=https://n8n.yourdomain.com   # Production n8n URL
N8N_API_TOKEN=<your-n8n-api-token>        # n8n API token
N8N_API_BASE_PATH=/api/v1                 # Usually /api/v1
N8N_AUTH_TYPE=bearer                      # Auth method

# Dashboard authentication
APP_AUTH_SECRET=<long-random-string>      # JWT secret for session tokens (required)

# Google OAuth (optional)
GOOGLE_CLIENT_ID=<your-google-client-id>  # OAuth client ID from Google Console
VITE_GOOGLE_CLIENT_ID=<same-as-above>     # Browser-side client ID (must match)

# Gmail SMTP (for password reset & support ticket emails)
GMAIL_USER=your-email@gmail.com           # Gmail address
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx    # Gmail App Password

# RBAC persistence (optional fallback when Google Sheets not configured)
KV_REST_API_URL=<vercel-kv-url>          # (optional) Vercel KV for persistent RBAC
KV_REST_API_TOKEN=<vercel-kv-token>      # (optional) Vercel KV token
RBAC_KV_KEY=n8n:rbac                      # (optional) KV key prefix (default: n8n:rbac)

# Support chat
SUPPORT_KV_KEY=n8n:support                # (optional) KV key for support tickets (default: n8n:support)
SUPPORT_CONFIG_PATH=data/support.json     # (optional) File path for support data (default: data/support.json)
APP_BASE_URL=https://yourdomain.com       # (optional) Base URL for support ticket email links
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
- `/settings` — App configuration (data source mode, n8n instance URL); renders `AdminSettings.jsx` for admins or `Settings.jsx` for clients
- `/admin` — Admin panel (users, roles, workflow allowlists) — **admin-only**
- `/support` — Support ticket list (client-facing support chat)
- `/support/:ticketId` — Individual support ticket thread
- `/login` — Authentication page (shown if not logged in)

### Data Management

**Three modes** (via `SettingsContext`, `src/context/SettingsContext.jsx`):
1. `'mockup'` — Static mock data from `src/utils/mock-data.js`
2. `'realtime-mockup'` — Mock data with simulated real-time updates
3. `'n8n-server'` — Live data from n8n via backend proxy

Switch modes in Settings page. Data persists to `localStorage` as `n8nDataSource`.

To add real data integration: Update mock data generators or replace with API calls in page components. The server already exposes `/api/dashboard/*` endpoints for data fetching.

### Styling & Theme

Tailwind v4 with CSS variables in `src/index.css`. Supports both **dark** and **light** themes (toggle via Settings):
- **Dark**: `--color-background: #0f1419`, `--color-foreground: #e0e0e0`, `--color-primary: #00d2d2`
- **Light**: CSS variable definitions updated dynamically based on `data-theme` attribute
- Theme preference stored in `localStorage` (key: `n8n-theme`)

No `tailwind.config.js` — uses `@tailwindcss/vite` plugin. Theme toggle managed by `SettingsContext` (`setTheme()` method). Use `clsx` + `tailwind-merge` for conditional classes.

### Visual Components & Effects

- **Animations**: GSAP for smooth transitions (preloader, scroll); `react-countup`/`countup.js` for animated KPI numbers
- **3D Effects**: Three.js + `postprocessing` used in effect components
- **Effect Layers**: `PixelBlast`, `LightPillar`, `ChromaGrid` (visual overlays in `src/components/`)
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
- **`src/context/auth-context.js`** — Raw React context object (created here, consumed elsewhere)
- **`src/context/AuthContext.jsx`** — Auth provider component + `apiFetch` helper; token stored in localStorage as `n8nDashboardAuthToken`
- **`src/context/useAuth.js`** — `useAuth()` hook to consume `AuthContext`
- **`src/hooks/useDashboardOverviewSse.js`** — SSE hook connecting to `/api/dashboard/stream` for real-time updates

**Test Users** (in-memory RBAC, reset on server restart):
- Admin: `root@gmail.com` / `root`
- Client: `client1@gmail.com` / `client1`

**Vercel Persistence**: By default, RBAC is in-memory and resets on cold start. To persist admin changes (user/client mappings), wire `rbacStore.js` to Vercel KV (set `KV_REST_API_URL`, `KV_REST_API_TOKEN`).

### Authentication Methods

The app supports three authentication flows:

**1. Email/Password Login** (`api/auth/login.js`, `server/apiRouter.js`)
- Direct login with email and password
- Test users (in-memory, reset on server restart):
  - Admin: `root@gmail.com` / `root`
  - Client: `client1@gmail.com` / `client1`
- Tokens stored in localStorage as `n8nDashboardAuthToken`

**2. Google OAuth** (`api/auth/google.js`, `server/googleAuth.js`)
- Sign in or sign up using Google account
- Requires `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` in environment
- Frontend uses `GoogleAuthButton` component (GoogleAuthButton.jsx)
- Existing users with matching email can use Google OAuth
- New signup users require admin approval before dashboard access
- JWT token verification via `verifyGoogleIdToken()` in `server/googleAuth.js`

**3. Password Reset** (`api/auth/reset-request.js`, `api/auth/reset-verify.js`, `api/auth/reset-password.js`)
- User requests reset via email (sends reset code)
- System generates time-limited reset code (6-digit, 10-minute expiry)
- User verifies code and sets new password
- Emails sent via Gmail SMTP (Nodemailer) — requires `GMAIL_USER` and `GMAIL_APP_PASSWORD`
- In dev without Gmail credentials, reset codes are logged to console for testing
- Reset codes stored in Google Sheets "password_resets" tab (or KV/memory fallback)
- Uses `api/_lib/resetCodes.js` for code generation and validation

**Password Security**: All passwords are hashed with bcrypt (cost factor 10). Legacy plaintext passwords are automatically migrated to bcrypt on first successful login.

### Support Chat

The app includes a **support ticket system** for client-support agent communication.

**Key Files**:
- **`src/pages/SupportChat.jsx`** — Frontend support chat UI (ticket list + thread view)
- **`server/supportStore.js`** — Support ticket persistence (in-memory, KV, or disk)
- **`data/support.json`** — Local support data store (development)
- **`api/support/`** — Serverless endpoints for ticket operations

**Data Structure**:
- Tickets have: id, clientId, subject, status (open/closed), messages array, timestamps
- Messages contain: authorUserId, authorRole (admin/client), body, createdAt
- Status flow: open → closed (can be reopened)

**Persistence** (similar to RBAC):
- **Local dev**: File-based (`data/support.json`) with in-memory cache
- **Vercel production**: Vercel KV (if configured) with disk fallback
- Set `SUPPORT_KV_KEY` (default: `n8n:support`) in Vercel environment variables

**Access Control**: Clients see only their own tickets; admins see all tickets.

### Server Details (`server/`)

- **index.js**: HTTP server, Vite middleware integration, static file serving
- **n8nClient.js**: n8n API client (auth, request building, error handling)
- **apiRouter.js**: Request routing to dashboard/auth/admin endpoints; includes rate limiting
- **dashboardCore.js**: Business logic (workflow queries, execution logs, health checks)
- **env.js**: Environment variable loader
- **accessControl.js**: RBAC utility functions (user lookup, bcrypt password verification)
- **tokenAuth.js**: JWT token validation middleware
- **rbacStore.js**: User/client/workflow mapping storage (Google Sheets → KV → disk → memory)
- **googleSheetsStore.js**: Google Sheets service layer (user/client CRUD, password resets, audit logs)
- **supportStore.js**: Support ticket persistence (in-memory, KV, or file-based storage — similar to RBAC pattern)
- **httpUtils.js**: HTTP response helpers

### Vercel Serverless Functions (`api/`)

Production deployment uses Vercel serverless functions instead of Node server:

**Authentication endpoints**:
- **`api/auth/login.js`** — Email/password login
- **`api/auth/signup.js`** — Client user signup
- **`api/auth/google.js`** — Google OAuth sign-in/sign-up
- **`api/auth/me.js`** — Current user info endpoint
- **`api/auth/reset-request.js`** — Request password reset (sends email)
- **`api/auth/reset-verify.js`** — Verify reset code
- **`api/auth/reset-password.js`** — Update password with reset code

**Dashboard endpoints**:
- **`api/dashboard/workflows.js`** — Fetch workflows (respects RBAC)
- **`api/dashboard/overview.js`** — Dashboard KPIs (respects RBAC)
- **`api/dashboard/recent-executions.js`** — Execution history (respects RBAC)
- **`api/dashboard/executions-count.js`** — Execution count metrics
- **`api/dashboard/health.js`** — System health check
- **`api/dashboard/stream.js`** — Real-time execution updates via SSE
- **`api/dashboard/_client.js`** — Shared n8n client utilities

**Admin & Support endpoints**:
- **`api/admin/rbac.js`** — Admin panel: user/client/workflow management
- **`api/support/index.js`** — List/create support tickets
- **`api/support/[ticketId].js`** — Get support ticket
- **`api/support/[ticketId]/messages.js`** — Get/post ticket messages
- **`api/support/[ticketId]/close.js`** — Close support ticket
- **`api/client/settings.js`** — Client-specific settings (GET/PUT)

**Shared utilities**:
- **`api/_lib/auth.js`** — Shared auth logic (JWT, RBAC, user lookup)
- **`api/_lib/support.js`** — Shared support utilities
- **`api/_lib/email.js`** — Email sending via Gmail SMTP (Nodemailer)
- **`api/_lib/resetCodes.js`** — Password reset code generation and validation

These functions handle the same logic as `server/` but in serverless context. They require Vercel environment variables (set in Vercel dashboard): `N8N_BASE_URL`, `N8N_API_TOKEN`, `N8N_API_BASE_PATH`, `APP_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SHEETS_SPREADSHEET_ID`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, etc.

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
