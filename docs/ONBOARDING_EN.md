# KVEX Technical Onboarding

## Product

KVEX is a server-first perp/funding, spread, portfolio, and read-only trading
monitor. The backend owns normalization and business logic; the Vue frontend
renders stable REST/Socket.IO contracts.

Current exchange coverage:

- Hyperliquid, Pacifica, Ethereal, Nado, and OKX for market data.
- Variational for funding only.
- Hyperliquid, Nado, OKX, and Ethereal for exchange balances.
- Hyperliquid, Pacifica, Ethereal, Nado, and OKX for open positions.
- Ethereal, Nado, and OKX for closed-position history.

The next development week is reserved for refactoring and bug discovery. Do not
start new feature work without explicit reprioritization. See `docs/ROADMAP.md`.

## Repository Layout

- `src` — Vue 3, Vue Router, TanStack Query, PrimeVue, Tailwind, Vite.
- `server` — Node.js TypeScript backend built on `http.createServer`.
- `server/src/exchanges` — isolated exchange REST/WS clients and raw types.
- `server/src/services` — funding, markets, spreads, portfolio, trading, users,
  and auth domain services.
- `server/src/server/http` — route definitions and HTTP handlers.
- `server/src/server/realtime` — Socket.IO market-data transport.
- `server/src/storage/postgres` — Postgres client, migrations, and runner.
- `docs` — canonical roadmap, onboarding, architecture, account, fee, theme, and
  documentation-source notes.

Do not add barrel `index.ts` files. Import concrete modules. New frontend feature
files should use direct names such as `Trading.vue`, not redundant `Overview`
suffixes.

## Backend Runtime

`server/src/server/index.ts` creates the HTTP server and Socket.IO runtime.
`server/src/server/router.ts` collects small route modules. HTTP errors are
normalized by `http-errors.ts`, and JSON responses are written through
`writeJsonResponse`.

Common module shape:

- `*.routes.ts` — route definitions.
- `*.handlers.ts` — transport-specific handlers.
- `*.service.ts` — domain orchestration.
- `*.utils.ts` — mapping, parsing, and reusable helpers.
- `*.types.ts` and `*.constants.ts` — shared contracts and values.

Aggregating endpoints should retain successful exchange/account data and expose
partial errors instead of failing the whole response.

## Market Data, Funding, And Spreads

Exchange REST/WS payloads are normalized into `MarketSnapshot`. The shared store
tracks field-level freshness and writes hot snapshots to Redis when configured.
The same state feeds:

- `GET /funding`
- `GET /funding/overview`
- `GET /markets/snapshots`
- `GET /spreads`
- Socket.IO `/market-data`

The spread engine applies executable BBO/depth prices, slippage, position-size
capacity, fees, funding impact, staleness, signal stability, and confidence.
Authenticated spread reads can apply saved Hyperliquid/OKX account fee profiles;
public opportunities never require an account.

## Auth And Availability

Browser auth uses Postgres-backed server sessions:

- `kvex_auth` — opaque HttpOnly session cookie.
- `kvex_csrf` — readable CSRF cookie sent as `X-CSRF-Token` on mutations.
- Postgres stores token hashes, expiry, and revocation state.
- `GET /auth/me` returns `200` with either the session or `{ "needsLogin": true }`.

Temporary network/5xx failures are retried and do not clear a valid frontend
session. Central API failures navigate to the standalone Service Unavailable
page. `GET /health` is the public retry probe. Unknown frontend paths render a
standalone 404 page.

## Portfolio

Portfolio is read-only. Users can save EVM/Solana wallet sources and exchange
connections. Main contracts:

- `GET/POST/PATCH/DELETE /portfolio/sources`
- `GET /portfolio/wallet-balances/me`
- `GET /portfolio/prices`
- `GET /portfolio/exchange-balances/me`
- `GET/POST/DELETE /portfolio/tokens`
- `GET/POST/DELETE /portfolio/exchange-tokens`

Wallet reads use GoldRush as the primary EVM multichain source and Alchemy as a
fallback/provider. Provider/chain failures are partial. Known spam assets are
removed on the backend.

Exchange credential fields currently use a temporary local-development JSONB
bridge. Read responses are sanitized, but this is not acceptable for release.
Encrypted secret storage is the first release blocker.

## Read-Only Trading

The Trading page has two tabs:

- Open positions: `GET /trading/positions/me`.
- Closed-position history: `GET /trading/history/me`.

Open positions are normalized for Hyperliquid, OKX, Nado, Pacifica, and
Ethereal. History uses native OKX position history, Ethereal position IDs/fills,
and reconstructed Nado match cycles. Both contracts preserve successful account
results when another account fails.

No order entry or execution exists. Paper trading, audit logging, encrypted
secrets, and risk controls must precede live execution.

## Frontend

Important areas:

- `src/App.vue` — authenticated shell and backend-availability routing.
- `src/router` — application routes and auth guard.
- `src/views/FundingOverview` — funding table.
- `src/views/SpreadsOverview` — spread filters/table and live cache updates.
- `src/views/PortfolioOverview` — wallet/exchange sources and assets.
- `src/views/Trading` — open and closed position tables.
- `src/views/Auth` — auth screens, session state, restart recovery.
- `src/views/Status` — 404 and Service Unavailable screens.
- `src/api` — typed API clients and backend-availability events.
- `src/theme` and `src/style.css` — PrimeVue preset and app tokens.

The frontend owns presentation and persisted UI state, not exchange/business
logic. Lightweight preferences use localStorage; larger filter state can use
IndexedDB.

## Storage And Observability

Redis stores hot market snapshots. Postgres stores users, sessions, password
resets, exchange accounts, wallet sources, and wallet token watchlists.
Market/opportunity/audit history in Postgres/Timescale is planned, not present.

`GET /metrics` exposes development metrics for HTTP, Redis, spread runs, counts,
and payload sizes. `GET /health` only reports backend process availability.

## Verification

Run from the repository root unless noted:

```bash
pnpm run test:frontend
pnpm run build
pnpm run lint
pnpm --dir server test
pnpm --dir server build
```

Direct local-bin equivalents are documented in `AGENTS.md` for environments
where package scripts are unavailable.

## Development Rules

- Never read, print, or commit `.env` files or real credentials.
- Ground exchange mappings in official documentation via `.skills/exchange-docs`.
- Keep connector-specific parsing/signing inside exchange modules.
- Move reusable constants/helpers to the nearest shared level.
- Preserve partial successes in aggregate endpoints.
- Add a regression test for every confirmed bug.
- During the refactoring week, prefer evidence-backed cleanup over new features.
- Do not add live trading before encrypted secrets, paper trading, risk controls,
  kill switch, and audit logs.

## Next Reading

- `AGENTS.md`
- `docs/ROADMAP.md`
- `docs/TECHNICAL_OVERVIEW.md`
- `docs/USER_ACCOUNT_MODEL.md`
- `docs/FEE_DATA_SOURCES.md`
- `docs/MCP.md`
