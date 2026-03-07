# n8n Live Dashboard

This is a React + Vite dashboard with a small Node server that securely connects to your n8n instance. The n8n token stays on the server (never in the browser).

## Setup

1. Create a `.env` from `.env.example` and set:
   - `N8N_BASE_URL` (example: `http://localhost:5678`)
   - `N8N_API_TOKEN` (your n8n API token)
   - `APP_AUTH_SECRET` (long random string for dashboard sessions)
   - `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` if you want Google sign-in/sign-up enabled

2. Install deps and run dev server:
   - `npm install`
   - `npm run dev`

3. In the app, go to **Settings** and select **Live n8n Server**.

## Access Control + Admin

The dashboard now requires login and enforces workflow visibility per client on the backend.

Default test users:

- Admin: `root@gmail.com` / `root`
- Client: `client1@gmail.com` / `client1`

Google auth notes:

- Existing users can use **Sign In with Google** if their Google account email matches the dashboard user email.
- New client users can use **Sign Up with Google** and will still require admin approval before dashboard access.

Admin can open `/admin` to:

- Create/edit users
- Assign user role (`admin` or `client`)
- Assign client workflow allowlists

Only workflows mapped to a client are returned for that client's dashboard APIs.
Execution queries are also fetched per assigned workflow for scoped clients so multi-workflow clients are reflected correctly.

## Deploy to Vercel

This project uses Vercel serverless functions under `api/dashboard/*` in production.

Set these Environment Variables in Vercel:

- `N8N_BASE_URL` (example: `https://n8n.yourdomain.com`)
- `N8N_API_BASE_PATH` (usually `/api/v1`)
- `N8N_API_TOKEN` (your n8n API token)
- If your n8n requires the header: set `N8N_AUTH_TYPE=header` and `N8N_AUTH_HEADER=X-N8N-API-KEY`

If `N8N_BASE_URL` points to `http://localhost:5678`, Vercel cannot reach it.

Note: on Vercel, RBAC writes can be ephemeral without external storage. For persistent admin changes, wire `server/rbacStore.js` to a durable database (Postgres/Redis/KV).

### Vercel persistence (required for stable client mappings)

To persist admin workflow assignments across serverless cold starts, set:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- Optional: `RBAC_KV_KEY` (default: `n8n:rbac`)

Without KV, RBAC may fall back to in-memory state on Vercel and appear to reset.

## Build / Run (prod)

- `npm run build`
- `npm run start`
