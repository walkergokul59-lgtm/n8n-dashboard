# n8n Live Dashboard

This is a React + Vite dashboard with a small Node server that securely connects to your n8n instance. The n8n token stays on the server (never in the browser).

## Setup

1. Create a `.env` from `.env.example` and set:
   - `N8N_BASE_URL` (example: `http://localhost:5678`)
   - `N8N_API_TOKEN` (your n8n API token)

2. Install deps and run dev server:
   - `npm install`
   - `npm run dev`

3. In the app, go to **Settings** and select **Live n8n Server**.

## Access Control + Admin

The dashboard now requires login and enforces workflow visibility per client on the backend.

Default test users:

- Admin: `root@gmail.com` / `root`
- Client: `client1@gmail.com` / `client1`

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

## Build / Run (prod)

- `npm run build`
- `npm run start`
