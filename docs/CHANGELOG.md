# Changelog

## 2026-06-13

- Added read-only portfolio backend endpoints for public wallet balances, USD
  prices, and authenticated saved wallet tokens.
- Added EVM/Solana wallet balance discovery with GoldRush, Alchemy fallback,
  per-chain partial errors, three-minute provider caches, and spam-token
  metadata.
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
