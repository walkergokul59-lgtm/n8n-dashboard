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

## Build / Run (prod)

- `npm run build`
- `npm run start`
