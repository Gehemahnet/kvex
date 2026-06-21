# KVEX Technical Overview

## Product Shape

KVEX is currently a server-first perp/funding, spread, portfolio, and read-only
trading monitor.
The backend collects public market data from centralized exchanges, normalizes
it into a shared snapshot model, computes spread opportunities, reads public
wallet balances, and exposes REST plus Socket.IO contracts to the Vue frontend.

The product follows a public-first, token-enhanced model. Public market data and
spread discovery stay available without user exchange tokens. Tokens refine the
same public view with account-specific fees, balances, open positions, and
closed-position history. Execution remains future scope.

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
  lookup, authenticated saved wallet sources, and saved token watchlists.
- `server/src/services/trading`: normalized open positions and closed-position
  history with partial per-account errors.
- `server/src/services/auth`: Postgres-backed sessions, CSRF, and password reset.
- `server/src/server/realtime`: Socket.IO bridge for frontend live updates.

### Frontend

The frontend is Vue 3 + Vue Router + TanStack Query + PrimeVue + Tailwind.
The app currently exposes Funding, Spreads, Portfolio, Trading, Auth, 404, and
Service Unavailable views in a Sakai-inspired shell.

Important frontend areas:

- `src/views/FundingOverview`: all-symbol funding monitor.
- `src/views/SpreadsOverview`: spread table, filters, live Socket.IO cache updates.
- `src/views/PortfolioOverview`: public wallet tracking, exchange access token
  management, priced asset table, and saved wallet/exchange source controls.
- `src/views/Trading`: open positions and closed-position history.
- `src/views/Status`: backend availability and 404 pages.
- `src/common/market-data-socket.ts`: singleton Socket.IO client.
- `src/common/local-storage.utils.ts`: localStorage-backed theme/session cleanup helpers.
- `src/common/indexed-db-state.utils.ts`: IndexedDB-backed persisted table/filter state.

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
wallet address tracking and a user-owned token watchlist foundation, but it does
not store private keys and does not execute trades.

### Wallet Balance Sources

`GET /portfolio/wallet-balances` accepts explicit EVM and Solana wallet
addresses. `GET /portfolio/wallet-balances/me` is the authenticated application
flow: it loads saved active user sources from Postgres and fetches their
balances.

For EVM `tokens=all`, the service prefers GoldRush:

- supported chain ids are configured in
  `server/src/services/portfolio/wallet-balances.constants.ts`
- the current set includes Ethereum, Optimism, Polygon, Base, Arbitrum, and
  HyperEVM
- each chain is requested independently and cached for three minutes
- partial chain failures are returned as `errors` with `chainId`
- when a failed chain also has an Alchemy RPC client, the service retries that
  chain through Alchemy instead of retrying every chain
- GoldRush spam metadata is used to drop known spam tokens on the backend before
  they reach the frontend

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

### Saved Wallet Sources

Authenticated users manage tracked wallet sources through:

- `GET /portfolio/sources`
- `POST /portfolio/sources`
- `PATCH /portfolio/sources?id=...`
- `DELETE /portfolio/sources?id=...`

`POST /portfolio/sources` accepts only a batch body:

```json
{
  "sources": [
    { "network": "evm", "address": "0x..." },
    { "network": "solana", "address": "..." }
  ]
}
```

It returns `{ "sources": [...] }`. There is no single-source create contract
because the app has not shipped yet and the frontend should avoid one request per
address.

The storage table is created by
`server/src/storage/postgres/migrations/007_create_user_portfolio_sources.sql`.
Mutations require the authenticated session and CSRF token. Reads are scoped to
the current user.

### Saved Wallet Tokens

Authenticated users can manage saved wallet token watchlists through:

- `GET /portfolio/tokens`
- `POST /portfolio/tokens`
- `DELETE /portfolio/tokens?id=...`

The storage table is created by
`server/src/storage/postgres/migrations/006_create_user_wallet_tokens.sql`.
Mutations require the authenticated session and CSRF token. Reads are scoped to
the current user and network.

### Exchange Access Tokens

Authenticated users can manage saved exchange access tokens through:

- `GET /portfolio/exchange-tokens`
- `POST /portfolio/exchange-tokens`
- `DELETE /portfolio/exchange-tokens?id=...`

`POST /portfolio/exchange-tokens` accepts only a batch body:

```json
{
  "tokens": [
    {
      "exchange": "okx",
      "label": "Read-only main account",
      "apiKey": "...",
      "apiSecret": "...",
      "passphrase": "...",
      "permissions": ["balances"],
      "expiresAt": "2026-12-31T00:00:00.000Z"
    }
  ]
}
```

Supported declared permissions are `balances`, `trades`, and `orders`. The
default frontend flow submits `balances`, which is enough for portfolio balances
now. Ethereal's read-only connection also declares `trades` for position history;
`orders` remains disabled.

The Portfolio Sources frontend keeps wallet sources and exchange tokens as
separate controls. The token table displays declared permissions, last-check
freshness, and the user-provided expiration window.

Exchange token read responses are sanitized: credential fields such as API key,
secret, and passphrase are not returned to the browser after creation.

### Exchange Account Balances

Authenticated users can read balances for saved exchange accounts through:

- `GET /portfolio/exchange-balances/me`

The endpoint reads active `user_exchange_accounts`, normalizes successful
balances, and returns partial per-account errors.
Expired exchange tokens are rejected before any exchange request is made and
reported as partial account errors.

Current connector behavior:

- Hyperliquid: reads public account state through the `info` endpoint using the
  saved account address and can refresh user fee profiles.
- Nado: reads the saved owner/subaccount summary and maps spot/perp balances.
- Ethereal: resolves the saved owner/subaccount and maps REST account balances.
- OKX: reads `/api/v5/account/balance` with signed read-only API credentials.
  The same refresh also attempts to read OKX SWAP trade fees and stores them as
  account-specific `feeProfiles`.
- Pacifica: reserved in the normalized contract, but currently returns an
  explicit unsupported error until the official account balance endpoint and
  signing payload are confirmed.

Secrets storage is still not final. During pre-release local development,
exchange credential-shaped fields may stay in the current local JSONB bridge and
are sanitized from read responses. Moving them to a dedicated encrypted secrets
store is mandatory before the first release and before broader UI exposure, fee
refresh automation, or live trading.

The Portfolio Assets frontend merges wallet asset rows and exchange balance rows
into the same table and total-value summary. Exchange rows use `Exchange` as the
data source and the exchange name as the network/group label.

### Account-Specific Spread Fees

`GET /spreads` remains public. When the request includes a valid browser session,
the handler loads saved user exchange accounts and applies non-expired
`feeProfiles` to matching market snapshots before spread calculation. Invalid,
expired, or missing auth simply falls back to public/documented fee data.

This lets the spread engine prefer user/account-specific API fee rates over
documentation fallbacks. Concrete refresh paths exist for OKX SWAP account fees
and Hyperliquid perp user fees.

Exchange tokens never gate public opportunity visibility. They improve precision
and prepare account-aware portfolio/trading workflows.

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

Redis is already available as a hot-cache layer for market snapshots, while
signal stability itself still stays in process memory.

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
If the caller is authenticated and has saved exchange fee profiles, spread fee
adjustment and fee confidence use those profiles when they match the exchange
and market. Without valid user data, the endpoint uses public snapshots and
documented/default fee data.

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
- optional `valueUsd`, `priceUsd`, and `logoUrl`
- partial per-chain or per-token errors

### `GET /portfolio/wallet-balances/me`

Authenticated endpoint that fetches balances for saved active portfolio sources.

Required:

- `tokens`, usually `all`

Returns the same normalized wallet balance shape as `GET /portfolio/wallet-balances`.
The response also includes `sourceResults`, a per-wallet summary with
`success`, `partial`, or `failed` status so the frontend can show progress and
retry failed portfolio reads without treating partial chain errors as a full
portfolio failure.

### `GET /portfolio/prices`

Required:

- `symbols`

Returns best-effort USD prices for trusted symbols plus partial symbol errors.

### `GET /portfolio/sources`

Authenticated read endpoint for saved EVM/Solana wallet sources.

Optional:

- `network`

### `POST /portfolio/sources`

Authenticated CSRF-protected endpoint that stores one or more wallet sources.

Required body:

- `sources`: non-empty array of `{ network, address, label? }`

Returns:

- `sources`: created or updated sources

Single-source create bodies are not supported.

### `PATCH /portfolio/sources?id=...`

Authenticated CSRF-protected endpoint that updates one owned source label or
status.

### `DELETE /portfolio/sources?id=...`

Authenticated CSRF-protected endpoint that deletes one owned source.

### `GET /portfolio/exchange-balances/me`

Authenticated endpoint that fetches balances from active saved exchange accounts.

Returns:

- `balances`: normalized per-exchange account balances
- `errors`: partial per-account errors

Current error codes include:

- `EXCHANGE_BALANCE_CREDENTIALS_REQUIRED`
- `EXCHANGE_BALANCE_UNSUPPORTED`
- `EXCHANGE_TOKEN_EXPIRED`
- `EXCHANGE_TOKEN_EXPIRY_INVALID`
- `EXCHANGE_BALANCE_FETCH_FAILED`

### `GET /portfolio/exchange-tokens`

Authenticated read endpoint for saved exchange access tokens.

### `POST /portfolio/exchange-tokens`

Authenticated CSRF-protected endpoint that stores one or more exchange access
tokens.

Required body:

- `tokens`: non-empty array of `{ exchange, label?, apiKey?, apiSecret?,
  passphrase?, address?, accountAddress?, permissions, expiresAt? }`

The default frontend flow submits `balances` permissions for read-only portfolio
balances. Extra account-data permissions can be selected later when those
workflows are enabled.

### `DELETE /portfolio/exchange-tokens?id=...`

Authenticated CSRF-protected endpoint that deletes one owned exchange access
token.

### `GET /portfolio/tokens`

Authenticated read endpoint for saved wallet token watchlist items.

### `POST /portfolio/tokens`

Authenticated CSRF-protected endpoint that stores one watchlist token.

### `DELETE /portfolio/tokens?id=...`

Authenticated CSRF-protected endpoint that deletes one owned watchlist token.

### `GET /trading/positions/me`

Authenticated read endpoint for normalized open positions. Successful accounts
remain in the response when another account fails.

### `GET /trading/history/me`

Authenticated read endpoint for normalized closed-position history. OKX uses
native position history, Ethereal groups native position fills, and Nado
reconstructs complete position cycles from matches. Errors are partial.

### `GET /health`

Public backend process availability probe used by the Service Unavailable page.

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

## Current Gaps And Planned Work

- Exchange token secrets are allowed to stay in the local development bridge for
  now, but encrypted storage is a first-release blocker.
- Redis hot cache exists for market snapshots; broader Redis usage is still
  intentionally limited.
- Postgres/Timescale history is planned but not introduced.
- Portfolio valuation is best-effort and depends on provider prices or trusted
  symbol price lookup.
- Collateral matching should be added when exchanges expose enough metadata.
- Frontend component/integration tests need a Vue component test setup if we want
  PrimeVue table interaction coverage.
- Live trading is intentionally blocked until portfolio, secrets, paper trading,
  risk controls, and audit logging exist.
- The next development week is reserved for refactoring and bug discovery:
  exchange mapping verification, partial errors, reconnect/restart behavior,
  Nado history-window edge cases, and frontend state/error audits.
