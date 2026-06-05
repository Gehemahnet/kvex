# Fee Data Sources

This note records how KVEX should treat exchange fee data for spread calculations.
It is a technical source for a future user-facing guide.

## Principle

Trading fees are account-specific on several exchanges. Public market data is enough
to compare prices, funding, and freshness, but it is not always enough to compute
the user's real net spread.

KVEX should label fee data by source:

- `api`: fee data came from an exchange API response for a product, account, or user.
- `documentation`: fee data came from an official fee schedule or documented base tier.

`documentation` fees are useful as a fallback, but they should reduce confidence
because the user's effective fee tier may differ.

## Current Exchange Notes

### Ethereal

Ethereal product API exposes product-level `makerFee` and `takerFee`.

Current handling:

- use API fees directly
- set `feeSource` to `api`

### Nado

Nado symbol and fee-rate APIs expose maker/taker fee rates. The current symbol
payload already includes `maker_fee_rate_x18` and `taker_fee_rate_x18`.

Current handling:

- use API fees directly
- set `feeSource` to `api`

### Hyperliquid

Hyperliquid fees are user-specific. The public fee schedule describes tiers, but
the effective user rates come from the `userFees` info endpoint and require a user
address.

Current handling:

- use documented base perp fees as fallback
- set `feeSource` to `documentation`

Future handling:

- allow the user to provide a Hyperliquid user address
- query `userFees`
- cache the effective maker/taker rates
- set `feeSource` to `api`

### Pacifica

Pacifica account info exposes `maker_fee` and `taker_fee`, but the endpoint needs
an account address. Public market/prices data does not provide the user's current
fee tier.

Current handling:

- use documented base perp fees as fallback
- set `feeSource` to `documentation`

Future handling:

- allow the user to provide a Pacifica account address
- query account info
- cache the effective maker/taker rates
- set `feeSource` to `api`

### OKX

OKX exposes account trading fee rates through the private account endpoint
`GET /api/v5/account/trade-fee`. It requires API credentials. Public tickers,
instruments, and funding endpoints do not provide the user's effective fee tier.

Current handling:

- use documented base swap/futures fees as fallback
- set `feeSource` to `documentation`

Future handling:

- add an account-specific fee profile backed by OKX API credentials
- query `GET /api/v5/account/trade-fee`
- cache the effective maker/taker rates by instrument type or fee group
- set `feeSource` to `api`

## User Guide Topics

When the frontend gets a user guide, explain:

- why fee-adjusted spread may be approximate without account-specific fee data
- what `api` versus `documentation` means
- why documented fees lower confidence
- what users need to provide for exact fees:
  - Hyperliquid user address
  - Pacifica account address
  - OKX API credentials with read permissions
- that secrets must not be stored until portfolio, secrets handling, and risk
  controls are implemented
