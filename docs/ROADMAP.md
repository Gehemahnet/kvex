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
- store user-provided secrets separately from public wallet addresses

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
- keep optional hooks for future onchain connectors, but do not let mempool/MEV logic drive the first backend shape
- keep backend contracts ahead of UI work; frontend should consume stable server filters and response shapes

## Current Reality

- frontend should expose only the Funding page until the first data flow is useful
- frontend theme direction is Sakai Vue inspired: compact dashboard shell, light/dark mode, Tailwind atomic layout classes, and PrimeVue component overrides only where component internals require them
- backend route `GET /funding` is implemented through `server/src/server/router.ts`
- backend route `GET /funding/overview` is implemented for the all-symbol table
- funding query parsing validates required `symbol`, required `timeframe`, and optional `exchanges`
- funding service aggregates per-exchange data from `hyperliquid`, `pacifica`, `ethereal`, and `nado`
- funding response includes normalized per-exchange series plus partial per-exchange errors
- Funding frontend consumes `/funding/overview` and renders one row per normalized symbol
- `socket.io` and `pg` are installed but not wired

## Current Funding Contract

`GET /funding`

### Query Params

- `symbol`: required normalized market symbol, for example `BTC`
- `timeframe`: required period, currently `DAY`, `WEEK`, `MONTH`, or `YEAR`
- `exchanges`: optional comma-separated list, currently `hyperliquid`, `pacifica`, `ethereal`, `nado`

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

1. Finish visual acceptance for the Sakai-based Funding shell in light and dark mode.
2. Keep Funding page aligned with `/funding/overview` and `/funding` query contracts.
3. Research OKX market data/funding integration from official API docs and Agent Trade Kit/MCP sources.
4. Keep Vite devtools enabled for local inspection.
5. Finish backend contract for spreads.
6. Add normalized market snapshot model.
7. Add Redis for hot state and pubsub.
8. Add spread/opportunity engine with confidence scoring.
9. Add Postgres/Timescale for history.
10. Add portfolio ingestion and secrets model.
11. Add paper trading and execution audit log.
12. Add live trading only with strict risk controls.

## Non-Negotiables

- no live trading before paper trading exists
- no API-key trading before secrets storage and audit log exist
- no opportunity ranking without fees, liquidity/slippage, and stale-data filters
- no UI-first work before backend contracts are stable

## Open Questions For Later

- first supported CEX set: `okx`, `binance`, `bybit`, `backpack`, `lighter`?
- first wallet coverage order: EVM, BTC, Solana?
- whether execution stays centralized in backend only, which is the recommended path
