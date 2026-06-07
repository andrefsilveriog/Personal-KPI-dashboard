# Personal KPI Dashboard

A metadata-driven personal KPI dashboard built with React, Vite, TypeScript, Firebase Auth, Firestore, Recharts, and React Grid Layout.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Firebase web app and enable Authentication. Anonymous auth is the current default sign-in method.

3. Copy `.env.example` to `.env.local` and fill in the Firebase client config:

   ```bash
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   ```

4. Run the app:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` starts the local Vite server.
- `npm run typecheck` runs TypeScript in strict mode.
- `npm run test` runs Vitest.
- `npm run build` typechecks, builds the app, and creates `dist/404.html` for GitHub Pages SPA fallback.

## Project Shape

The app is scaffolded for a configurable KPI engine. Metric-specific concepts should live in seed configuration or user data, not in business logic.

Starter records can be created from Settings with **Seed starter metrics** after Firebase config and auth are available. The seeder uses stable document IDs and skips records that already exist.

Firestore data is scoped under `users/{userId}` with collection helpers for:

- `metrics`
- `metricFields`
- `metricEntries`
- `goalVersions`
- `dashboards`
- `dashboardWidgets`
- `dimensions`
- `budgetVersions`
- `appSettings`
