# TODO

## Funding Overview

- Add `GET /funding/overview` for the table view.
- Keep `GET /funding` as the detailed historical endpoint for one symbol.
- Overview query shape:
  - `timeframe`: required, currently `DAY`, `WEEK`, `MONTH`, or `YEAR`
  - `exchanges`: optional comma-separated list
- Overview response should return one row per normalized symbol and dynamic per-exchange funding cells.
- Leave `STRATEGY` empty for now.
- Leave global row `APR` empty for now, or compute it later from selected strategy rules.
- Build overview data from batch market snapshot endpoints instead of per-symbol funding history:
  - Hyperliquid: `getFullMarketsMetadata()`
  - Pacifica: `getMarkets()`
  - Ethereal: `getMarkets()`
- Add server-side cache:
  - exchange markets cache, TTL 5-15 minutes
  - funding overview cache, TTL 30-60 seconds
  - keep the abstraction replaceable with Redis later
- Frontend Funding page should render one row per symbol, with exchange columns similar to the reference screenshot.

## Pacifica Year Funding

- Current `YEAR` history request can hit Pacifica 429 because it paginates too much history.
- Do not use Pacifica historical funding for all-symbol overview.
- For overview, use current market `funding_rate` and annualize it:
  - `apr = hourlyFundingRate * 24 * 365`
- For detailed `/funding?timeframe=YEAR` on Pacifica, choose one:
  - adapt from `MONTH` to `YEAR`
  - or return a partial `TIMEFRAME_NOT_SUPPORTED` / rate-limit-safe error
  - add throttling/retry/backoff only as a secondary protection

