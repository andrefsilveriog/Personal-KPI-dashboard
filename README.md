# Personal KPI Dashboard

A simpler personal dashboard rebuilt from the working Excel sheet:

- weekly workout summary
- daily habit tracking
- nutrition macro checks
- monthly spending and budgets
- local browser storage

The current version is intentionally local-first. No Firebase setup is required to run it.

## Run

```bash
npm install
npm run dev
```

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
