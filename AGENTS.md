## KVEX

- Monorepo: `src` frontend, `server` backend.
- Frontend: Vue 3, Vue Router, TanStack Query, PrimeVue, Tailwind, Vite.
- Backend: Node.js + TypeScript, `http.createServer`, REST/WS exchange clients,
  Socket.IO, Postgres, Redis hot cache, Vitest.
- Canonical plan: `docs/ROADMAP.md`.
- Technical onboarding: `docs/ONBOARDING_EN.md` and `docs/ONBOARDING_RU.md`.
- MCP and official documentation sources: `docs/MCP.md`.

### Current Product

- Server-first perp/funding, spread, portfolio, and read-only trading monitor.
- Frontend pages: Funding, Spreads, Portfolio, Trading, Auth, 404, and backend
  service-unavailable status.
- Market/funding connectors: `hyperliquid`, `pacifica`, `ethereal`, `nado`,
  `okx`; `variational` is funding-only.
- Portfolio reads support saved EVM/Solana wallets and exchange accounts.
- Open positions are normalized for Hyperliquid, OKX, Nado, Pacifica, and
  Ethereal.
- Closed-position history is normalized for OKX, Nado, and Ethereal with
  partial per-account errors.
- Browser auth uses Postgres-backed HttpOnly sessions and CSRF tokens.
- `GET /health` is the public backend availability probe.

### Active Work Window

- The next development week is dedicated to refactoring and bug discovery.
- Do not start a new product feature unless the user explicitly reprioritizes.
- Prefer simplifying boundaries, removing duplication, tightening types,
  verifying exchange mappings against official docs, and adding regression
  coverage for discovered defects.
- Pay particular attention to partial-error behavior, reconnect/restart flows,
  stale caches, auth recovery, history aggregation edge cases, responsive UI,
  and light/dark visual consistency.
- Preserve current REST and Socket.IO contracts unless a confirmed bug requires
  a deliberate breaking correction; the product has not shipped, so correctness
  still wins over compatibility with obsolete drafts.

### Main Contracts

- `GET /funding?symbol=BTC&timeframe=DAY&exchanges=hyperliquid,pacifica`
- `GET /funding/overview?timeframe=DAY&exchanges=...`
- `GET /markets/snapshots`
- `GET /spreads`
- `GET /portfolio/wallet-balances/me`
- `GET /portfolio/exchange-balances/me`
- `GET/POST/PATCH/DELETE /portfolio/sources`
- `GET/POST/DELETE /portfolio/tokens`
- `GET/POST/DELETE /portfolio/exchange-tokens`
- `GET /trading/positions/me`
- `GET /trading/history/me`
- `GET /health`

### Code Organization

- Do not add barrel files (`index.ts` re-export aggregators); import concrete
  modules directly.
- Use frontend aliases where practical: `@api`, `@components`, `@utils`,
  `@views`, `@router`, `@theme`, `@types`.
- Do not add redundant `Overview` suffixes to new frontend feature files.
- Move constants used outside one file to the nearest shared constants file.
- Move small helpers to adjacent `*.utils.ts`; lift helpers shared by multiple
  consumers to the nearest shared level.
- Keep exchange-specific parsing and signing inside exchange connectors.
- Keep business logic on the backend; frontend tables consume normalized
  contracts and own only presentation/state concerns.

### Verification Commands

- Codex may run package and verification commands needed to keep the project healthy.
- Allowed package management: `pnpm install`.
- Root: `pnpm run lint`, `pnpm run build`, `pnpm run test:frontend`,
  `oxlint src server/src`, `vue-tsc -b`.
- Backend: `pnpm --dir server test`, `pnpm --dir server build`, `vitest run`.
- Direct local bins are allowed when scripts are unavailable:
  `node ./node_modules/vue-tsc/bin/vue-tsc.js -b`,
  `node ./node_modules/vitest/vitest.mjs run`,
  `./node_modules/.bin/oxlint.CMD src server/src`.
- Request sandbox escalation with a narrow command prefix when required.

### Environment And Secrets

- Never read, open, print, quote, edit, delete, stage, commit, or otherwise
  interact with `.env` or `.env.*` files anywhere in the repository.
- Ask for non-secret configuration or use documented safe defaults when needed.
- Never write real API tokens, secrets, passphrases, private keys, mnemonics, or
  session tokens into code, tests, docs, fixtures, screenshots, or examples.
- Use placeholders such as `...`, `test-key`, or deterministic fake values.
- Before committing credential-related work, inspect staged diffs for
  credential-shaped strings without reading environment files.

### Product Safety

- Public opportunities must remain visible without exchange credentials.
- Exchange credentials are a temporary local-development JSONB bridge and must
  move to encrypted storage before the first release.
- No live trading before encrypted secrets, paper trading, risk controls,
  kill switch, and audit logging exist.
- Keep hot market state in Redis; planned historical market/opportunity storage
  belongs in Postgres/Timescale.
- Use `.skills/exchange-docs` and official exchange sources for connector work.
- Treat deleted documents as obsolete drafts; do not recreate them.
