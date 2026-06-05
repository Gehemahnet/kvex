# Changelog

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
