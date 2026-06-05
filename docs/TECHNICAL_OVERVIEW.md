# KVEX Technical Overview

## Product Shape

KVEX is currently a server-first perp/funding and spread monitor. The backend
collects public market data from centralized exchanges, normalizes it into a
shared snapshot model, computes spread opportunities, and exposes both REST and
Socket.IO contracts to the Vue frontend.

Current exchanges:

- Hyperliquid
- Pacifica
- Ethereal
- Nado
- OKX

## Runtime Architecture

### Backend

The backend is a Node.js TypeScript service built on `http.createServer`.
Routing is implemented in `server/src/server/router.ts` with small route modules
under `server/src/server/http`.

Important backend areas:

- `server/src/exchanges`: isolated REST and WebSocket clients per exchange.
- `server/src/services/funding`: funding history and all-symbol funding overview.
- `server/src/services/markets`: normalized market snapshots and shared in-memory
  snapshot store.
- `server/src/services/spreads`: spread engine, confidence scoring, executable
  price/slippage, and in-memory signal stability.
- `server/src/server/realtime`: Socket.IO bridge for frontend live updates.

### Frontend

The frontend is Vue 3 + Vue Router + TanStack Query + PrimeVue + Tailwind.
The app currently exposes Funding and Spreads views in a Sakai-inspired shell.

Important frontend areas:

- `src/views/FundingOverview`: all-symbol funding monitor.
- `src/views/SpreadsOverview`: spread table, filters, live Socket.IO cache updates.
- `src/common/market-data-socket.ts`: singleton Socket.IO client.
- `src/common/local-storage.utils.ts`: validated persisted UI state.

## Market Snapshot Flow

Market snapshots are the backend source of truth for spread calculation.

1. REST bootstrap calls funding overview endpoints and maps cells into snapshots.
2. Exchange WebSocket collectors stream price, funding, BBO, and order book data.
3. `upsertMarketSnapshot` enriches identity and merges updates into an in-memory
   store keyed by exchange and normalized symbol.
4. The store stamps separate freshness timestamps for price, funding, and
   liquidity fields.
5. `/markets/snapshots`, `/spreads`, and Socket.IO subscriptions read from the
   same store.

Snapshot identity includes:

- normalized symbol/base asset
- optional quote asset
- optional settlement asset
- inferred contract type
- inferred asset class

Known equity/synthetic markets are skipped by spread calculation so crypto
opportunities are not polluted by stock, commodity, or private-market-like
products.

## Spread Engine

`createSpreadOpportunity` receives two snapshots for the same normalized symbol
and returns one directed opportunity when the markets are comparable.

The engine:

- rejects incompatible explicit market identity fields
- prefers executable ask-to-buy and bid-to-sell prices
- falls back to mark, mid, or index when executable prices are unavailable
- computes weighted average execution prices from order book depth for
  `positionSizeUsd`
- filters out opportunities that cannot satisfy the requested position size
- exposes aggregate execution slippage
- computes max executable notional and a reason when it is missing
- subtracts taker fees when both sides expose them
- computes funding APR spread
- computes holding-period funding impact from normalized hourly funding
- computes `estimatedNetSpreadPercent` when fees and funding impact are both
  available
- attaches confidence breakdown and stale state

Spread ranking prefers:

1. `estimatedNetSpreadPercent`
2. `feeAdjustedPriceSpreadPercent`
3. raw `priceSpreadPercent`

## Confidence Model

Confidence is a weighted score from:

- price source quality
- price freshness
- funding availability
- fee availability and source
- liquidity quality

Liquidity confidence uses depth, top-of-book sizes, open interest, and 24h
volume. Documentation fee fallbacks are allowed but scored lower than
account-specific API fees.

## Signal Stability

Spread stability is currently an in-memory TTL store. It tracks a directed
symbol/exchange-pair signal with:

- first seen timestamp
- last seen timestamp
- occurrence count
- lifetime
- rolling raw spread averages
- rolling fee-adjusted spread average
- rolling funding APR spread average
- rolling estimated net spread average

This intentionally stays in memory until the planned Redis hot-cache work.

## REST Contracts

### `GET /funding`

Required:

- `symbol`
- `timeframe`

Optional:

- `exchanges`

Returns per-exchange funding series with partial exchange errors.

### `GET /funding/overview`

Required:

- `timeframe`

Optional:

- `exchanges`

Returns one normalized row per symbol with per-exchange funding values.

### `GET /markets/snapshots`

Optional:

- `symbol`
- `exchanges`

Returns normalized snapshots from the shared store.

### `GET /spreads`

Optional:

- `symbol`
- `exchanges`
- `minPriceSpreadPercent`
- `maxSnapshotAgeMs`
- `positionSizeUsd`
- `minOccurrences`
- `minLifetimeMs`
- `holdingPeriodHours`

Returns ranked spread opportunities and partial exchange errors.

## Socket.IO Contract

Socket path: `/market-data`

Client events:

- `market:snapshots:subscribe`
- `market:snapshots:unsubscribe`
- `spreads:subscribe`
- `spreads:unsubscribe`

Server events:

- `market:snapshots:update`
- `spreads:update`
- `market-data:error`

Socket spread payloads use the same filter shape as `GET /spreads`. The frontend
writes socket updates into the matching TanStack Query cache key, so REST and
live updates stay aligned.

## Current Gaps

- Account-specific taker/maker fees are not connected yet.
- User portfolio and API-key storage do not exist yet.
- Redis hot cache is planned but not introduced.
- Postgres/Timescale history is planned but not introduced.
- Collateral matching should be added when exchanges expose enough metadata.
- Frontend component/integration tests need a Vue component test setup if we want
  PrimeVue table interaction coverage.
- Live trading is intentionally blocked until portfolio, secrets, paper trading,
  risk controls, and audit logging exist.
