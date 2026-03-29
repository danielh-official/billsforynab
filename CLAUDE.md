# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Svelte MCP Server

You have access to comprehensive Svelte 5 and SvelteKit documentation via the Svelte MCP server. Use these tools whenever writing or modifying Svelte code:

- **list-sections** — Use FIRST to discover available documentation sections. Always call this at the start of Svelte/SvelteKit tasks.
- **get-documentation** — Fetch full docs for relevant sections found via list-sections.
- **svelte-autofixer** — Analyze Svelte code for issues. MUST be called before sending any Svelte code to the user. Keep calling until no issues remain.
- **playground-link** — Generate a Svelte Playground link. Only call after user confirmation, and NEVER if code was written to project files.

## Commands

```bash
bun run dev          # Start dev server
bun run build        # Production build
bun run preview      # Preview production build
bun run check        # Type-check with svelte-check
bun run lint         # Prettier + ESLint
bun run format       # Auto-format with Prettier
bun run test:unit    # Run unit/browser tests (Vitest + Playwright)
bun run test:e2e     # Run E2E tests (Playwright)
bun run test         # All tests
```

To run a single test file: `bunx vitest run src/lib/index.spec.ts`

## Environment Setup

Copy `.env.example` to `.env` and set `PUBLIC_YNAB_CLIENT_ID` to a YNAB OAuth client ID. The app runs without it in demo mode.

## Architecture

**Bills (For YNAB)** is a SvelteKit app that manages YNAB scheduled transactions ("bills"). All data is stored client-side — there is no backend database.

### Data Layer (`src/lib/db.ts`)

Dexie (IndexedDB) with three tables:
- **budgets** — YNAB budget metadata + `is_default`, `server_knowledge`, `last_fetched`
- **scheduled_transactions** — Bills with extra fields: `budget_id`, `excluded`, `monthly_amount`, `history`
- **category_groups** — YNAB category groups scoped by `budget_id`

### Business Logic (`src/lib/index.ts`)

All YNAB API calls and core logic live here:
- `fetchBudgets(accessToken)` — Pulls from YNAB API, populates Dexie tables
- `createBillInYNAB / updateBillInYNAB / deleteBillInYNAB` — CRUD against YNAB's scheduled_transactions endpoint
- `assignHistoricalTransactionsToScheduledTransactions()` — Matches past transactions to bills for history display
- `createFakeDataForDemo()` — Seeds demo budget (id: `'demo'`) with 8 sample bills
- Frequency utilities: `supportedFrequencies`, `parseFrequency()`, `frequencyToDays()`, `getFrequencyMultiplier()`

### Auth Flow

OAuth 2.0 via YNAB. Token stored in `sessionStorage` as `ynab_access_token`. Two scopes: read-only (`/callback`) and read-write (`/callback/write`). The login page stores the intended destination in `sessionStorage` before redirecting to YNAB, then the callback page retrieves it post-auth.

### Route Structure

- `/` — Landing/marketing page
- `/login` — OAuth login (read-only vs read-write choice)
- `/callback` and `/callback/write` — OAuth return handlers
- `/plans` — List of synced YNAB budgets
- `/plan/[id]` — Bill grid for a specific budget
- `/plan/[id]/bill/new` — Create bill form
- `/plan/[id]/bill/[billId]` — Edit bill form
- `/guide`, `/privacy` — Static content pages (loaded server-side from markdown files)

### Demo Mode

The budget with `id: 'demo'` is special — it uses fake local data instead of YNAB API calls. No YNAB account required. Guarded by `dummy` parameter in CRUD functions.

### Styling

Tailwind CSS v4 with `@tailwindcss/forms` and `@tailwindcss/typography`. Custom tooltip styles in `src/lib/app.css`. Dark mode supported via class strategy.

### Key Conventions

- All navigation within the app uses `resolve()` from `$app/paths` to support base path deployments.
- Svelte 5 runes throughout (`$state`, `$derived`, `$effect`, `$props`). No legacy Options API.
- `liveQuery` from Dexie used for reactive IndexedDB queries in components.
- ESLint enforces `svelte/no-navigation-without-resolve` (bare `goto()` calls without `resolve()` are errors).
- Prettier config: tabs, single quotes, no trailing commas, 100 char print width.
