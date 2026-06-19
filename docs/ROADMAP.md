# KVEX Roadmap

## Canonical Product Scope

### 1. Arbitrage
- collect funding, prices, and liquidity/orderbook data from CEX and DEX
- normalize market snapshots by exchange and symbol
- compute spreads, fees, slippage, funding impact, net profit, confidence score
- rank opportunities and stream them to UI

### 2. Portfolio
- ingest CEX balances via API keys
- ingest wallet balances for EVM, BTC, Solana addresses
- normalize assets, pnl, exposure, transfers
- store user-provided secrets locally during pre-release development only; move
  them to encrypted storage before the first release

### 3. Trading
- start with paper trading
- then real order execution through exchange APIs
- require TP/SL, position sizing, limits, kill switch, audit log

## What Was Inconsistent

- old docs describe an onchain DEX arbitrage system with mempool, gas, Flashbots, pool reserves, and Ethers.js
- current codebase is a perp/funding monitor with REST clients for `hyperliquid`, `pacifica`, `ethereal`
- old docs mention Express/Fastify, Pinia, Tailwind, Axios, MongoDB; current project uses none of them
- old docs imply multi-service collectors already exist; current backend is one small server and exchange clients
- old docs focus on DEX-only architecture; current product intent includes CEX + DEX + portfolio + trading

## Resolved Direction

- treat old DEX-only execution notes as idea bank, not architecture source of truth
- prioritize perp/funding market data and spread discovery first
- use a public-first, token-enhanced model: public market data remains available
  without exchange tokens, while user tokens refine fees, balances, positions,
  and future terminal execution
- keep optional hooks for future onchain connectors, but do not let mempool/MEV logic drive the first backend shape
- keep backend contracts ahead of UI work; frontend should consume stable server filters and response shapes

## Current Reality

- frontend exposes Funding and Spreads pages
- frontend theme direction is Sakai Vue inspired: compact dashboard shell, light/dark mode, Tailwind atomic layout classes, and PrimeVue component overrides only where component internals require them
- backend route `GET /funding` is implemented through `server/src/server/router.ts`
- backend route `GET /funding/overview` is implemented for the all-symbol table
- backend route `GET /markets/snapshots` is implemented for normalized market snapshots
- backend route `GET /spreads` is implemented for ranked spread opportunities
- backend route `GET /portfolio/wallet-balances` is implemented for read-only EVM and Solana public wallet balances
- backend route `GET /portfolio/wallet-balances/me` is implemented for authenticated balance reads from saved user wallet sources
- backend route `GET /portfolio/exchange-balances/me` is implemented for authenticated read-only balances from saved user exchange accounts
- backend route `GET /portfolio/prices` is implemented for best-effort portfolio USD prices
- backend routes `GET/POST/PATCH/DELETE /portfolio/sources` are implemented for authenticated saved EVM/Solana wallet sources
- backend routes `GET/POST/DELETE /portfolio/tokens` are implemented for authenticated saved wallet token watchlists
- backend routes `GET/POST/DELETE /portfolio/exchange-tokens` are implemented for authenticated saved exchange access tokens
- `POST /portfolio/sources` accepts only a batch body `{ sources: [...] }`; the older single-source create body is intentionally not supported because the product has not shipped yet
- funding query parsing validates required `symbol`, required `timeframe`, and optional `exchanges`
- funding service aggregates per-exchange data from `hyperliquid`, `pacifica`, `ethereal`, `nado`, `okx`, and `variational`
- funding response includes normalized per-exchange series plus partial per-exchange errors
- Funding frontend consumes `/funding/overview` and renders one row per normalized symbol
- Spreads frontend consumes `/spreads`, subscribes to Socket.IO updates, and renders executable spread opportunities
- Portfolio frontend consumes `/portfolio/sources`, `/portfolio/wallet-balances/me`,
  `/portfolio/exchange-tokens`, and `/portfolio/exchange-balances/me` for
  current-user portfolio tracking foundations
- Socket.IO is wired for market snapshots and spreads on `/market-data`
- `pg` is integrated for users, auth sessions, password reset records,
  saved portfolio sources, and saved wallet token watchlists
- portfolio wallet reads use GoldRush as the primary EVM multichain provider,
  Alchemy as EVM/Solana fallback/provider, three-minute provider caches, and
  partial per-chain errors
- backend portfolio balance responses drop known spam and unsupported priced
  tokens before they reach the frontend
- authenticated `/spreads` reads can apply saved account-specific fee profiles;
  OKX SWAP and Hyperliquid perp fees are refreshed during exchange balance reads
  and by a periodic best-effort background job
- exchange tokens do not gate public spread visibility; they only improve
  precision and prepare future portfolio/trading workflows

## Current Funding Contract

`GET /funding`

### Query Params

- `symbol`: required normalized market symbol, for example `BTC`
- `timeframe`: required period, currently `DAY`, `WEEK`, `MONTH`, or `YEAR`
- `exchanges`: optional comma-separated list, currently `hyperliquid`, `pacifica`, `ethereal`, `nado`, `okx`, `variational`

### Frontend Direction

- Funding page owns the query controls for symbol, timeframe, exchanges, and future filters
- frontend sends selected exchanges and timeframe to `/funding`
- backend returns data already normalized to the requested timeframe where possible
- when an exchange cannot provide the requested timeframe directly, backend can adapt source data and mark the series with `isFundingAdapted`
- response keeps successful exchange data even when one or more exchanges fail

`GET /funding/overview`

- required `timeframe`
- optional `exchanges`
- returns one row per normalized symbol
- per-exchange cells include only non-zero APR/funding values
- overview uses batch market snapshot endpoints instead of per-symbol historical funding

### Future Funding Filters

- symbol search or market selector
- exchange multi-select
- timeframe selector
- optional source/adapted data toggle
- optional minimum data freshness filter
- optional quote or market-type filters once connectors expose enough metadata

## Current Portfolio Contracts

`GET /portfolio/sources`

- authenticated read endpoint
- optional `network`: `evm` or `solana`
- returns saved wallet sources owned by the current user

`POST /portfolio/sources`

- authenticated and CSRF-protected mutation endpoint
- accepts only `{ "sources": [{ "network": "evm" | "solana", "address": "...", "label"?: "..." }] }`
- creates or updates multiple wallet sources in one request
- returns `{ "sources": [...] }`

`PATCH /portfolio/sources?id=...`

- authenticated and CSRF-protected mutation endpoint
- updates one owned source label or status

`DELETE /portfolio/sources?id=...`

- authenticated and CSRF-protected mutation endpoint
- deletes one owned source

`GET /portfolio/wallet-balances/me`

- authenticated read endpoint
- loads balances from saved active wallet sources
- accepts `tokens`, usually `all`
- returns normalized balances with source network/chain metadata, partial errors,
  and per-source load statuses in `sourceResults`

`GET /portfolio/prices`

- accepts trusted symbols only
- returns best-effort USD prices and partial symbol errors

`GET /portfolio/exchange-balances/me`

- authenticated read endpoint
- loads active saved `user_exchange_accounts`
- returns normalized balances and partial per-account errors
- Hyperliquid reads public account state by address
- OKX reads signed account balances with read-only API credentials and attempts
  to refresh SWAP fee profiles
- Pacifica is reserved behind the same contract, but balance endpoint wiring is blocked until the official account balance endpoint/signing details are confirmed

`GET /portfolio/exchange-tokens`

- authenticated read endpoint
- returns saved exchange access tokens owned by the current user
- tokens include exchange, label, status, declared permissions, optional expiry,
  and last checked timestamp

`POST /portfolio/exchange-tokens`

- authenticated and CSRF-protected mutation endpoint
- accepts only a batch body `{ "tokens": [...] }`
- token permissions are stored as `balances`, `trades`, and `orders`;
  the default UI flow uses `balances`
- base read-only tokens are intended to power balances now and future account
  data later

`DELETE /portfolio/exchange-tokens?id=...`

- authenticated and CSRF-protected mutation endpoint
- deletes one owned exchange access token

## Target Backend Shape

- `connectors/`: per exchange or chain adapter, isolated and retry-safe
- `collectors/`: funding, tickers, orderbook/liquidity, balances
- `domain/markets/`: symbol normalization, snapshots, spread engine
- `domain/portfolio/`: balances, wallet ingestion, valuation, exposure
- `domain/trading/`: paper execution, live execution, risk guards
- `transport/http/`: REST endpoints for config, history, portfolio, execution
- `transport/ws/`: live streams for opportunities and market state
- `storage/redis/`: hot cache, pubsub
- `storage/postgres/`: users, settings, history, audit

## Immediate Build Order

1. Visually verify the current Spreads table and filters in light/dark mode.
2. Keep Funding aligned with `/funding/overview` and `/funding` query contracts.
3. Keep Spreads aligned with `/markets/snapshots`, `/spreads`, and Socket.IO contracts.
4. Add frontend component/integration tests when Vue component test tooling is introduced.
5. Keep Redis hot state focused on live market snapshots and opportunities.
6. Before first release, move exchange API secrets from the temporary local JSONB bridge to encrypted secret storage.
7. Expand account-specific fee profiles beyond OKX SWAP and Hyperliquid perp to
   the next exchanges whose official account-tier fee APIs are available.
8. Add exchange account-history ingestion only after portfolio balances and fee profiles are stable.
9. Add Postgres/Timescale for market and opportunity history.
10. Add paper trading and execution audit log.
11. Add live trading only with strict risk controls.

## Non-Negotiables

- no live trading before paper trading exists
- no first release before exchange token secrets are moved to encrypted storage
- no API-key trading before encrypted secrets storage and audit log exist
- no hiding public opportunities just because a user has not connected exchange tokens
- no opportunity ranking without fees, liquidity/slippage, and stale-data filters
- no UI-first work before backend contracts are stable

## Open Questions For Later

- first supported CEX set: `okx`, `binance`, `bybit`, `backpack`, `lighter`?
- first wallet coverage order: EVM, BTC, Solana?
- whether execution stays centralized in backend only, which is the recommended path
- how to model collateral compatibility once exchanges expose enough collateral metadata
