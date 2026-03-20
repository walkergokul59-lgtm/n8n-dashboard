# n8n Live Dashboard

A React 19 SPA that displays real-time workflow execution data from n8n instances. The frontend connects to a Node.js backend server that securely proxies n8n API calls.

## Architecture

- **Frontend**: React 19 + Vite 8, Tailwind CSS v4, React Router v7, Recharts
- **Backend**: Node.js HTTP server (no framework) in `server/`
- **Build**: Vite bundles to `dist/` for production

## Running the App

```bash
npm run dev    # Dev server on port 5000 (Vite middleware + Node API)
npm run build  # Production build to dist/
npm start      # Production mode (serves built dist/)
```

## Key Files

- `server/index.js` - Main HTTP server, serves both API and frontend
- `server/apiRouter.js` - All `/api/*` route handlers
- `server/env.js` - Environment variable loading
- `server/n8nClient.js` - n8n API client
- `server/rbacStore.js` - User/role persistence (disk or Google Sheets)
- `src/` - React frontend source
- `vite.config.js` - Vite configuration (host: 0.0.0.0, port: 5000, allowedHosts: true)

## Environment Variables

Set these in Replit Secrets or environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `N8N_BASE_URL` | n8n instance URL (e.g. `http://localhost:5678`) | Yes |
| `N8N_API_TOKEN` | n8n API token from Settings → API | Yes |
| `N8N_API_BASE_PATH` | Usually `/api/v1` | No (default: `/api/v1`) |
| `N8N_AUTH_TYPE` | `bearer` or `header` | No (default: `bearer`) |
| `APP_AUTH_SECRET` | JWT secret for session tokens | Yes |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Base64 Google service account JSON | No |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Google Sheets ID for database | No |
| `GMAIL_USER` | Gmail address for email sending | No |
| `GMAIL_APP_PASSWORD` | Gmail app password | No |
| `PORT` | Server port | No (default: 5000) |

## Deployment

- Target: autoscale
- Build: `npm run build`
- Run: `node server/index.js --prod`
- Port: 5000
