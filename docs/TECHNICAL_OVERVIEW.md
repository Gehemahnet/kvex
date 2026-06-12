# KVEX Technical Overview

## Product Shape

KVEX is currently a server-first perp/funding, spread, and portfolio monitor.
The backend collects public market data from centralized exchanges, normalizes
it into a shared snapshot model, computes spread opportunities, reads public
wallet balances, and exposes REST plus Socket.IO contracts to the Vue frontend.

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
- `server/src/services/portfolio`: public wallet balance discovery, USD price
  lookup, and authenticated saved token watchlists.
- `server/src/server/realtime`: Socket.IO bridge for frontend live updates.

### Frontend

The frontend is Vue 3 + Vue Router + TanStack Query + PrimeVue + Tailwind.
The app currently exposes Funding, Spreads, Auth, and Portfolio views in a
Sakai-inspired shell.

Important frontend areas:

- `src/views/FundingOverview`: all-symbol funding monitor.
- `src/views/SpreadsOverview`: spread table, filters, live Socket.IO cache updates.
- `src/views/PortfolioOverview`: public wallet tracking, priced asset table, and
  saved token watchlist controls.
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

## Portfolio Backend

Portfolio backend work is intentionally read-only today. It supports public
wallet address tracking and a user-owned token watchlist, but it does not store
private keys and does not execute trades.

### Wallet Balance Sources

`GET /portfolio/wallet-balances` accepts EVM and Solana wallet addresses. The
current frontend calls it per wallet source so one slow or failed wallet does
not block the whole portfolio table.

For EVM `tokens=all`, the service prefers GoldRush:

- supported chain ids are configured in
  `server/src/services/portfolio/wallet-balances.constants.ts`
- the current set includes Ethereum, Optimism, Polygon, Base, Arbitrum, and
  HyperEVM
- each chain is requested independently and cached for three minutes
- partial chain failures are returned as `errors` with `chainId`
- when a failed chain also has an Alchemy RPC client, the service retries that
  chain through Alchemy instead of retrying every chain
- GoldRush spam metadata is preserved as `isSpam` so the frontend can hide spam
  tokens by default while still allowing the user to show them

For EVM without GoldRush, or as fallback for failed supported chains, Alchemy is
used through JSON-RPC:

- native balances use `eth_getBalance`
- ERC-20 discovery uses `alchemy_getTokenBalances`
- token metadata uses `alchemy_getTokenMetadata`
- a failing chain returns a partial `CHAIN_BALANCE_FETCH_FAILED` error while
  successful chains remain in the response

For Solana:

- native SOL uses `getBalance`
- SPL tokens use `getTokenAccountsByOwner`
- Solana token values are priced later through `/portfolio/prices` when a trusted
  symbol is available

### USD Pricing

`GET /portfolio/prices` accepts a comma-separated symbol list and returns
best-effort USD prices. Requests are parallelized and cached for three minutes.
The frontend can keep showing balances while missing prices refresh in the
background.

### Saved Wallet Tokens

Authenticated users can manage saved wallet token watchlists through:

- `GET /portfolio/tokens`
- `POST /portfolio/tokens`
- `DELETE /portfolio/tokens?id=...`

The storage table is created by
`server/src/storage/postgres/migrations/006_create_user_wallet_tokens.sql`.
Mutations require the authenticated session and CSRF token. Reads are scoped to
the current user and network.

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

### `GET /portfolio/wallet-balances`

Optional legacy shape:

- `network`
- `address`
- `addresses`

Preferred multi-source shape:

- `networks`: comma-separated list, currently `evm` and `solana`
- `evmAddresses`: comma-separated EVM wallet addresses
- `solanaAddresses`: comma-separated Solana wallet addresses
- `tokens`: comma-separated token list, usually `all`

Returns:

- normalized wallet token balances
- source metadata including network, chain id, chain key, and chain name when
  available
- optional `valueUsd`, `priceUsd`, `logoUrl`, and `isSpam`
- partial per-chain or per-token errors

### `GET /portfolio/prices`

Required:

- `symbols`

Returns best-effort USD prices for trusted symbols plus partial symbol errors.

### `GET /portfolio/tokens`

Authenticated read endpoint for saved wallet token watchlist items.

### `POST /portfolio/tokens`

Authenticated CSRF-protected endpoint that stores one watchlist token.

### `DELETE /portfolio/tokens?id=...`

Authenticated CSRF-protected endpoint that deletes one owned watchlist token.

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
- User portfolio currently supports public wallet balances and saved token
  watchlists, but not exchange API-key balance ingestion yet.
- Redis hot cache is planned but not introduced.
- Postgres/Timescale history is planned but not introduced.
- Portfolio valuation is best-effort and depends on provider prices or trusted
  symbol price lookup.
- Collateral matching should be added when exchanges expose enough metadata.
- Frontend component/integration tests need a Vue component test setup if we want
  PrimeVue table interaction coverage.
- Live trading is intentionally blocked until portfolio, secrets, paper trading,
  risk controls, and audit logging exist.
