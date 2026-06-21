# Changelog

## 2026-06-21

- Added read-only Trading with normalized open positions for Hyperliquid, OKX,
  Nado, Pacifica, and Ethereal.
- Added closed-position history for OKX, Nado, and Ethereal, including native
  OKX history, position-cycle aggregation, and partial per-account errors.
- Added Ethereal REST/WS account-state reconciliation and fill tracking.
- Expanded read-only exchange balance and fee support, including Nado, Ethereal,
  Hyperliquid user fees, and OKX SWAP fees.
- Added backend restart-safe auth recovery, public `/health`, Service Unavailable,
  and frontend 404 pages.
- Added the Trading frontend and updated exchange connection options.
- Synchronized roadmap, onboarding, account, fee, MCP, theme, and agent guidance;
  the next week is dedicated to refactoring and bug discovery.

## 2026-06-14

- Added authenticated saved portfolio sources for EVM and Solana wallets.
- Made `POST /portfolio/sources` batch-only with `{ sources: [...] }` and
  removed the single-source create contract before release.
- Wired the Portfolio add-wallet dialog to send one source creation request for
  all submitted addresses.
- Updated portfolio documentation around saved sources, authenticated
  `/portfolio/wallet-balances/me`, GoldRush/Alchemy balance discovery, and
  backend spam-token filtering.
- Documented temporary local exchange-token credential storage as a pre-release
  bridge and marked encrypted secret storage as mandatory before first release.
- Updated theme documentation to point to the current `src/theme/primary.theme.ts`
  Lara-based preset.

## 2026-06-13

- Added read-only portfolio backend endpoints for public wallet balances, USD
  prices, and authenticated saved wallet tokens.
- Added EVM/Solana wallet balance discovery with GoldRush, Alchemy fallback,
  per-chain partial errors, three-minute provider caches, and spam-token
  handling.
- Added Postgres migration and repository layer for user wallet token
  watchlists.
- Documented the current portfolio balance flow and provider fallback behavior.

## 2026-06-06

- Added Redis-backed hot cache support for normalized market snapshots.
- Added structured runtime metrics and `/metrics` diagnostics endpoint.
- Added Postgres user, exchange account, password reset, and session migrations.
- Added server-side auth sessions with HttpOnly cookies, CSRF tokens, refresh,
  logout, and anonymous `/auth/me` status responses.
- Added Auth frontend pages and session bootstrap behavior.
- Refactored backend and frontend spreads request pipelines.
- Added bilingual onboarding documentation for junior developers.

## 2026-06-05

- Added normalized market snapshot store with field-level freshness.
- Added native WebSocket collectors for Hyperliquid, Pacifica, Ethereal, Nado,
  and OKX market data.
- Added order book depth ingestion for Hyperliquid, Ethereal, OKX, Pacifica, and
  Nado.
- Added `/markets/snapshots` and `/spreads` REST contracts.
- Added Socket.IO `/market-data` channel for market snapshots and spreads.
- Added spread calculation with executable BBO/depth prices, slippage,
  position-size filtering, max executable notional, confidence breakdown, and
  signal stability.
- Added funding interval normalization and holding-period funding impact.
- Added estimated net spread ranking from fee-adjusted spread plus funding
  impact.
- Added market identity enrichment, base-asset aliases, and equity/synthetic
  market exclusion.
- Added Nado depth gap resync logging with throttled counters.
- Added Spreads frontend view with persisted filters, live cache updates, and
  unit tests for formatting, filtering, fee warnings, selection status, and query
  cache keys.

## Earlier

- Added Funding overview backend contract and frontend table.
- Added Vue Query, persisted filters, scroll pagination, and pinned funding rows.
- Added Tailwind through Vite and Sakai-inspired PrimeVue shell styling.
- Added MCP and theme customization notes.
