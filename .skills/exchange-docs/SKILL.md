---
name: exchange-docs
description: Find and use official exchange API documentation for market data, funding, symbols, authentication, balances, orders, and trading integration. Use when Codex needs to inspect or compare exchange docs, confirm endpoint behavior, map symbols, understand funding data semantics, or add new exchange connectors for Variational, Nado, Ethereal, Pacifica, Hyperliquid, and OKX.
---

# Exchange Docs

## Overview

Use this skill to ground exchange integration work in official documentation first. Prefer official docs over memory or third-party summaries when checking endpoints, auth, funding semantics, symbol formats, rate limits, and trading rules.

## Workflow

1. Read `references/exchanges.md` to pick the right official source for the target exchange.
2. Browse only the official documentation domain unless the user explicitly asks for other sources.
3. Extract only the facts needed for the task:
   - authentication method
   - base URL
   - funding endpoints and timeframe semantics
   - market metadata and symbol naming
   - balances, positions, orders, or trades if relevant
   - pagination, rate limits, and error format
4. When implementing code, normalize exchange-specific details into project types instead of leaking raw docs terminology into shared code.
5. If two docs pages conflict, prefer the more specific API page over a generic overview and call out the conflict explicitly.

## Output Rules

- Cite the official docs page used.
- Distinguish clearly between documented facts and inference.
- When comparing exchanges, keep the comparison on the same axes:
  - auth
  - symbols
  - funding history
  - balances
  - orders
  - limits/errors
- If docs do not support a requested feature directly, say so and propose the nearest adaptation.

## References

- Exchange source list: `references/exchanges.md`
