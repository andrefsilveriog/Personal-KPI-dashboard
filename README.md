# Personal KPI Dashboard

A simpler personal dashboard rebuilt from the working Excel sheet:

- weekly workout summary
- daily habit tracking
- nutrition macro checks
- monthly spending and budgets
- local browser storage with optional Firebase sync

The current version is local-first. Firebase Auth and Firestore sync are wired in when `.env.local` has the Firebase web app config.

## Run

```bash
npm install
npm run dev
```

## Firebase

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md).

Short version:

- `.env.local` holds the existing Firebase web app config and is ignored by git.
- Google sign-in syncs data under `users/{uid}` in Firestore.
- `firestore.rules` contains the rules to paste/publish in Firebase Console.
- If Firebase is not configured, the app stays usable with local browser storage.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

## Shape

The app mirrors the workbook tabs:

- `Dashboard`: weekly scorecard plus monthly spending view
- `Today`: quick entry forms for workout, habits, nutrition, and spending
- `Logs`: simple tables for recent records
- `Settings`: workout target, macro goals, and category budgets

Defaults are seeded from `life_dashboard_v2 (1).xlsx`, including the 4-days-per-week workout target, 225/150/56 macro goals, 5% macro tolerance, and monthly budget categories.
