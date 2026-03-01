# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server with HMR (Vite)
npm run build    # Production build → dist/
npm run lint     # ESLint checks
npm run preview  # Serve production build locally
```

## Architecture

**React 19 SPA** built with Vite 8, React Router 7, and Tailwind CSS 4. No backend — all data is mock/generated client-side.

### Routing & Layout

`App.jsx` defines 6 routes under a shared `Layout` component (`Sidebar` + `Header` + `<Outlet>`). Active routes: `/` (Dashboard), `/agent-logs`, `/invoice-runs`. The others (`/order-sync`, `/sms-outreach`, `/settings`) are placeholders with no page component yet.

### Data

All data lives in `src/utils/mock-data.js`. Each page calls its relevant generator inside `useState(() => getMockData())` — there is no API, no global store, no async fetching. To wire up real data, replace mock generators with API calls.

### Styling

Dark theme with cyan accent. Key CSS variables in `src/index.css`:
- `--color-background: #0f1419`
- `--color-foreground: #e0e0e0`
- `--color-primary: #00d2d2`

Use `clsx` + `tailwind-merge` (via the `cn` helper if added) for conditional classes. Tailwind v4 uses the `@tailwindcss/vite` plugin — no `tailwind.config.js` needed.

### Visualization

Charts use `recharts` (AreaChart). `three.js` and `postprocessing` are installed but not yet used — likely intended for future 3D widgets.

### State

Local `useState` only. No global state manager. Component-level state is sufficient given the mock data architecture.
