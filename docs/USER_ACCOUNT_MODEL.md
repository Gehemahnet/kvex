# User Account Model

This note records the first KVEX user/account direction. It is intentionally
minimal and read-only first.

## Scope

Current goal:

- local user identity
- login-capable account model
- email for password reset
- server-side browser sessions
- public wallet source tracking for portfolio balances
- read-only exchange connections for balances, fees, positions, and history

Out of scope for now:

- personal profile data
- order execution credentials
- private wallet keys

## Current User Model

The first migration creates `users`, and `004_add_users_email.sql` adds optional
email:

- `id`: UUID primary key
- `login`: unique normalized login
- `email`: optional unique normalized email
- `password_hash`: precomputed password hash
- `status`: `active` or `disabled`
- `created_at`
- `updated_at`

No name, phone, or other personal profile fields are stored yet.

## Auth Sessions

The browser auth flow uses server-side sessions instead of storing JWTs in
localStorage:

- `kvex_auth`: opaque session token in an `HttpOnly` cookie
- `kvex_csrf`: readable CSRF token cookie sent back as `X-CSRF-Token`
- `user_sessions.token_hash`: hash of the session token
- `user_sessions.csrf_token_hash`: hash of the CSRF token
- `expires_at`: session lifetime, configured by `AUTH_SESSION_DAYS`
- `revoked_at`: logout/revocation marker

`/auth/me` returns `200` for anonymous users with `needsLogin: true`, so public
frontend bootstrapping should not hard-fail when the user is logged out.

## Read-Only Exchange Accounts

The second database migration creates `user_exchange_accounts`. In the current
application this table is also the temporary exchange access-token registry:

- `id`
- `user_id`
- `exchange`
- `label`
- `status`
- `public_data`: exchange-specific typed JSON data
- `capabilities`: fees, balances, positions, trades, orders
- `last_checked_at`
- `created_at`
- `updated_at`

`public_data` is intentionally exchange-specific. Examples:

- Hyperliquid: public account address, optional API credential fields, declared
  permissions, optional expiry, and fee profiles
- Pacifica: public account address, optional API credential fields, declared
  permissions, optional expiry, and fee profiles
- OKX: account level, API key, secret, passphrase, declared permissions,
  optional expiry, and fee profiles

The exchange token API is:

- `GET /portfolio/exchange-tokens`
- `POST /portfolio/exchange-tokens`
- `DELETE /portfolio/exchange-tokens?id=...`

`POST /portfolio/exchange-tokens` is batch-only:

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

The default frontend token permission is `balances`. Ethereal's read-only flow
also declares `trades` because it supplies position history. `orders` remains
disabled until execution work begins. The frontend displays declared
permissions, `last_checked_at` freshness, and the user-provided expiry window.

Exchange token read responses are sanitized. API key, secret, and passphrase are
not returned to the browser after creation.

Secrets should live in a separate table or vault-backed store:

- OKX API key, secret, passphrase
- credentials for additional exchanges

Hyperliquid and Pacifica may need only public account addresses for fee lookup
depending on the endpoint.

## Exchange Balances

`GET /portfolio/exchange-balances/me` reads active `user_exchange_accounts` and
returns normalized balances plus partial per-account errors.
Expired exchange tokens are rejected before calling the exchange and reported as
partial account errors.

Current behavior:

- Hyperliquid uses a saved public account address and the public `info` endpoint.
- Nado uses a saved owner address/subaccount.
- Ethereal uses a saved owner address/subaccount and REST/WS account state.
- OKX uses signed read-only API credentials to call account balance.
- Pacifica is modeled but not wired to a concrete balance endpoint yet.

The same exchange account records feed read-only open positions and supported
closed-position history. Trading endpoints return partial per-account errors.

Important: exchange credential-shaped fields in `public_data` are a temporary
local development bridge. They can stay there while the product is pre-release,
but encrypted secret storage is mandatory before the first release, broad UI
exposure, fee refresh automation, or any trading features.

## Portfolio Sources

`007_create_user_portfolio_sources.sql` creates `user_portfolio_sources` for
public wallet tracking:

- `id`
- `user_id`
- `type`: currently only `wallet`
- `network`: `evm` or `solana`
- `address`
- `label`
- `status`: `active` or `disabled`
- `created_at`
- `updated_at`

The uniqueness rule is `(user_id, network, lower(address))`, so the same wallet
can be tracked by different users but not duplicated for one user/network.

Create requests are batch-only:

```json
{
  "sources": [
    { "network": "evm", "address": "0x..." },
    { "network": "solana", "address": "..." }
  ]
}
```

The response is `{ "sources": [...] }`. Single-source create bodies are not part
of the contract.

## Saved Wallet Tokens

`006_create_user_wallet_tokens.sql` creates a user-owned token watchlist
foundation:

- `id`
- `user_id`
- `network`: currently `evm`
- `token`
- `label`
- `created_at`
- `updated_at`

The current portfolio UI is centered on saved wallet sources. Token watchlists
remain a backend foundation for later manual tracking needs.

## Fee Profiles

Spreads should not query private credentials directly. Instead, exchange account
services should periodically refresh fee profiles:

- `user_id`
- `exchange`
- `symbol` or instrument type
- `maker_fee_rate`
- `taker_fee_rate`
- `source`: `api`, `documentation`, or `userOverride`
- `expires_at`

The spread engine can then prefer account-specific `api` fees when a user context
is available, and fall back to documented fees otherwise.

Current behavior:

- `/portfolio/exchange-balances/me` updates `last_checked_at` for successfully
  checked exchange accounts
- OKX balance refresh also attempts to refresh SWAP fee profiles
- authenticated `/spreads` requests apply non-expired saved fee profiles before
  opportunity calculation
- Hyperliquid user fees and OKX SWAP fees have concrete API refresh paths

## Safety Rules

- read-only credentials first
- no trading credentials before paper trading, risk controls, and audit logs
- no first release before exchange credentials move to encrypted storage
- no secrets in Redis
- no live execution keys in this stage
