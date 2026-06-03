# Exchange Sources

Use these official documentation sources first.

## Variational

- docs: https://docs.variational.io/technical-documentation/api
- use for: API structure, endpoints, auth, market/trading behavior

## Bulk

- docs: https://docs.bulk.trade/api-reference/introduction.md
- openapi: https://docs.bulk.trade/api-reference/openapi.yaml
- use for: HTTP and WebSocket API, market data, account state, trading, signing, and transport details

## Nado

- docs: https://docs.nado.xyz/developer-resources/get-started
- use for: onboarding, API entrypoints, developer flow, integration prerequisites

## Aster

- docs: https://docs.asterdex.com/for-developers/aster-api/api-documentation
- use for: Aster API documentation, endpoints, auth, account and trading integration

## Ethereal

- docs: https://docs.ethereal.trade/developer-guides/trading-api
- use for: trading API, products, funding, auth, balances, orders

## Pacifica

- docs: https://pacifica.gitbook.io/docs/api-documentation/api
- use for: market data, funding history, products, account/trading endpoints

## Hyperliquid

- docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
- use for: info endpoint, exchange endpoint, metadata, funding history, order flow

## Lighter

- docs: https://docs.lighter.xyz/trading/api
- api reference: https://apidocs.lighter.xyz/docs/get-started
- use for: trading API, API keys, sub-accounts, and endpoint reference

## OKX

- docs: https://www.okx.com/docs-v5/en/#overview
- agent tradekit: https://www.okx.com/ru/agent-tradekit
- use for: API structure, REST and WebSocket endpoints, market data, funding, account, trading, authentication, rate limits, and error codes
- use agent tradekit for: MCP server, OKX agent skills, CLI workflow, read-only/demo/live trading modes, and AI trading safety model

## Comparison Checklist

When reading docs for implementation, extract these fields if available:

- auth model
- base REST URL
- websocket URL
- product or market list endpoint
- funding current endpoint
- funding history endpoint
- balance or account endpoint
- order placement endpoint
- pagination rules
- rate limits
- error response shape
- symbol format and quote currency conventions
