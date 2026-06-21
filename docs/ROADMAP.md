# KVEX Roadmap

## Product Scope

KVEX is a server-first perp/funding product with three connected areas:

1. Arbitrage discovery: normalized market data, funding, liquidity, fees,
   slippage, stability, confidence, and ranked spread opportunities.
2. Portfolio: read-only wallet and exchange balances, valuation, account
   sources, positions, and exposure foundations.
3. Trading: read-only terminal first, then paper execution, and only later live
   execution with strict risk controls.

## Implemented Baseline

- Funding series and all-symbol overview across Hyperliquid, Pacifica, Ethereal,
  Nado, OKX, and funding-only Variational.
- Normalized live market snapshots, order-book liquidity, spread ranking,
  account-aware fees, Redis hot cache, and Socket.IO updates.
- Postgres-backed users, browser sessions, password resets, wallet sources,
  wallet token watchlists, and exchange account records.
- Read-only EVM/Solana portfolio balances with GoldRush/Alchemy fallbacks,
  partial errors, spam filtering, and best-effort USD valuation.
- Read-only exchange balances for Hyperliquid, Nado, OKX, and Ethereal;
  Pacifica remains unsupported until its official balance contract is confirmed.
- Saved exchange connections with sanitized read responses and temporary
  pre-release credential storage.
- Account-specific Hyperliquid perp and OKX SWAP fee profile refresh.
- Read-only open positions for Hyperliquid, OKX, Nado, Pacifica, and Ethereal.
- Closed-position history for OKX, Nado, and Ethereal with partial account errors.
- Funding, Spreads, Portfolio, and Trading frontend pages.
- Postgres-backed auth, backend-restart recovery, public health probe, dedicated
  service-unavailable page, and frontend 404 page.

## Next Week: Refactoring And Bug Hunt

No feature expansion is planned for the next development week. Work should stay
inside the implemented baseline unless the user explicitly changes priority.

1. Audit service and connector boundaries; move misplaced helpers/constants and
   remove duplication without changing stable contracts.
2. Verify exchange response mappings against current official documentation,
   especially position size units, timestamps, liquidation fields, PnL, and
   closed-position semantics.
3. Stress partial-error behavior so one provider/account failure never removes
   successful data from aggregate responses.
4. Test backend restarts, auth recovery, Redis/Postgres outages, Socket.IO
   reconnects, and stale in-memory state.
5. Audit Nado closed-position reconstruction when the match-history window
   starts mid-position, includes flips, or truncates older opening fills.
6. Audit Ethereal REST/WS reconciliation, reconnect rehydration, liquidation
   price preservation, and fill deduplication.
7. Review frontend query lifecycles, loading/empty/error states, responsive
   tables, accessibility, and light/dark rendering.
8. Add focused regression tests for every confirmed bug; introduce Vue component
   tests only where unit tests cannot protect the interaction.
9. Remove dead code, obsolete compatibility paths, stale CSS selectors, and
   documentation drift discovered during the audit.
10. Finish the week with full tests/build/lint and a written list of remaining
    verified risks rather than speculative feature work.

## Planned After The Refactoring Week

1. Move exchange credentials from the temporary JSONB bridge to encrypted
   secret storage.
2. Expand account-tier fee profiles only where official APIs are available.
3. Add Postgres/Timescale market, opportunity, and audit history.
4. Move additional hot/reconnect-sensitive state to Redis where measurements
   justify it.
5. Add portfolio exposure and transfer history after balance contracts stabilize.
6. Add paper trading with deterministic fills and an execution audit log.
7. Add order-entry UI only after paper trading and risk controls are stable.
8. Add live execution only after encrypted secrets, position sizing, TP/SL,
   limits, kill switch, and auditability are complete.

## Non-Negotiables

- No first release with plaintext exchange credentials in application JSONB.
- No API-key trading before encrypted secret storage and audit logging.
- No live trading before paper trading and strict risk controls.
- No hiding public opportunities because a user has not connected an exchange.
- No opportunity ranking without fee, liquidity/slippage, and stale-data handling.
- No UI-first feature expansion before its backend contract is stable.

## Deferred Product Decisions

- Next CEX connectors after the current set: Binance, Bybit, Backpack, or Lighter.
- BTC wallet support order relative to broader EVM/Solana coverage.
- Collateral compatibility and cross-exchange margin normalization.
- Exact Timescale retention/downsampling policy for market and opportunity history.
