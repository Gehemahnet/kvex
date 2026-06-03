# TODO

- Return to Atlantis/Figma theme work after Funding functionality is accepted.
- Add more fixtures for exchange-specific market aliases if they appear in live data.
- Decide whether cache TTLs should be configurable constants only or environment-driven later.
- Split the current working changes into commits:
  - funding overview backend and cache
  - funding overview frontend
  - Pacifica YEAR adaptation and HTTP retry/backoff
  - docs cleanup
- Start the next roadmap item after Funding is accepted:
  - normalized market snapshot model
  - or spreads contract

## Done Context

- `GET /funding/overview` backend contract is implemented.
- Funding overview uses batch market snapshot endpoints instead of per-symbol historical funding.
- In-memory cache is implemented for exchange markets and overview responses.
- Frontend Funding page consumes `/funding/overview`.
- Funding page supports Vue Query, localStorage filters, scroll pagination, and persisted pinned rows.
- Funding view state is moved into a composable; pure helpers live in utils.
- Tailwind CSS is connected through the official Vite plugin.
- Pacifica detailed `YEAR` funding adapts from `MONTH`.
- Upstream HTTP retry/backoff for `429` and `5xx` is implemented.
