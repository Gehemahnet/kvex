# KVEX: технический онбординг

## Продукт

KVEX — server-first монитор perp/funding, спредов, портфеля и read-only
торговых данных. Нормализация и бизнес-логика находятся на backend; Vue frontend
отображает стабильные REST/Socket.IO контракты.

Текущее покрытие бирж:

- Hyperliquid, Pacifica, Ethereal, Nado и OKX — market data.
- Variational — только funding.
- Hyperliquid, Nado, OKX и Ethereal — exchange balances.
- Hyperliquid, Pacifica, Ethereal, Nado и OKX — открытые позиции.
- Ethereal, Nado и OKX — история закрытых позиций.

Следующая неделя разработки полностью отведена под рефакторинг и поиск багов.
Новые фичи без явной смены приоритета не начинаем. План — в `docs/ROADMAP.md`.

## Структура репозитория

- `src` — Vue 3, Vue Router, TanStack Query, PrimeVue, Tailwind, Vite.
- `server` — Node.js TypeScript backend на `http.createServer`.
- `server/src/exchanges` — изолированные REST/WS клиенты и raw-типы бирж.
- `server/src/services` — funding, markets, spreads, portfolio, trading, users,
  auth.
- `server/src/server/http` — route definitions и HTTP handlers.
- `server/src/server/realtime` — Socket.IO transport для market data.
- `server/src/storage/postgres` — клиент Postgres, миграции и runner.
- `docs` — roadmap, onboarding, архитектура, accounts, fees, theme и источники
  официальной документации.

Не добавляйте barrel-файлы `index.ts`: импортируйте конкретные модули. Новые
frontend feature-файлы называйте прямо (`Trading.vue`), без лишнего `Overview`.

## Backend runtime

`server/src/server/index.ts` создаёт HTTP server и Socket.IO runtime.
`server/src/server/router.ts` собирает маленькие route modules. Ошибки приводятся
к стабильному JSON через `http-errors.ts`, ответы пишутся через
`writeJsonResponse`.

Обычная структура модуля:

- `*.routes.ts` — routes.
- `*.handlers.ts` — transport handlers.
- `*.service.ts` — domain orchestration.
- `*.utils.ts` — mapping, parsing и reusable helpers.
- `*.types.ts` / `*.constants.ts` — общие контракты и значения.

Aggregate endpoints должны сохранять успешные данные других бирж/аккаунтов и
возвращать partial errors, а не ронять весь ответ.

## Market data, funding и spreads

REST/WS payload бирж нормализуются в `MarketSnapshot`. Общий store хранит
field-level freshness и пишет горячие snapshots в Redis, если он настроен.
Одно состояние обслуживает:

- `GET /funding`
- `GET /funding/overview`
- `GET /markets/snapshots`
- `GET /spreads`
- Socket.IO `/market-data`

Spread engine учитывает executable BBO/depth, slippage, размер позиции,
доступный объём, комиссии, funding impact, stale state, signal stability и
confidence. Авторизованный запрос может применять fee profiles Hyperliquid/OKX,
но публичные opportunities никогда не требуют аккаунта.

## Auth и доступность backend

Browser auth использует server sessions в Postgres:

- `kvex_auth` — opaque HttpOnly cookie.
- `kvex_csrf` — readable CSRF cookie для `X-CSRF-Token` в mutations.
- Postgres хранит hashes, expiry и revocation state.
- `GET /auth/me` всегда возвращает `200`: session или `{ "needsLogin": true }`.

Временные network/5xx ошибки повторяются и не очищают валидную frontend-сессию.
Централизованный сбой API открывает standalone Service Unavailable page.
`GET /health` используется кнопкой Retry. Неизвестные frontend URL открывают
отдельную 404 page.

## Portfolio

Portfolio остаётся read-only. Пользователь может сохранять EVM/Solana wallets и
exchange connections. Основные контракты:

- `GET/POST/PATCH/DELETE /portfolio/sources`
- `GET /portfolio/wallet-balances/me`
- `GET /portfolio/prices`
- `GET /portfolio/exchange-balances/me`
- `GET/POST/DELETE /portfolio/tokens`
- `GET/POST/DELETE /portfolio/exchange-tokens`

Wallet reads используют GoldRush как основной EVM multichain source и Alchemy
как fallback/provider. Ошибки provider/chain частичные. Known spam assets
отбрасываются на backend.

Exchange credentials пока находятся во временном JSONB bridge только для
локальной pre-release разработки. Read responses санитизируются, но до первого
релиза секреты обязательно должны переехать в encrypted storage.

## Read-only Trading

Trading page содержит две вкладки:

- Open positions: `GET /trading/positions/me`.
- Closed-position history: `GET /trading/history/me`.

Открытые позиции нормализуются для Hyperliquid, OKX, Nado, Pacifica и Ethereal.
History использует native OKX position history, Ethereal position IDs/fills и
реконструкцию полных циклов из Nado matches. Оба endpoint сохраняют результаты
успешных аккаунтов при ошибке другого аккаунта.

Order entry и execution отсутствуют. Перед live execution обязательны paper
trading, audit log, encrypted secrets и risk controls.

## Frontend

Важные зоны:

- `src/App.vue` — shell и переход на страницу недоступного backend.
- `src/router` — routes и auth guard.
- `src/views/FundingOverview` — funding table.
- `src/views/SpreadsOverview` — filters/table и live cache updates.
- `src/views/PortfolioOverview` — wallet/exchange sources и assets.
- `src/views/Trading` — открытые и закрытые позиции.
- `src/views/Auth` — auth screens, session state, restart recovery.
- `src/views/Status` — 404 и Service Unavailable.
- `src/api` — typed clients и backend-availability events.
- `src/theme`, `src/style.css` — PrimeVue preset и app tokens.

Frontend отвечает за presentation и persisted UI state, но не за exchange или
spread business logic. Лёгкие настройки хранятся в localStorage, более тяжёлые
filters могут храниться в IndexedDB.

## Storage и observability

Redis хранит горячие market snapshots. Postgres хранит users, sessions,
password resets, exchange accounts, wallet sources и wallet token watchlists.
Market/opportunity/audit history в Postgres/Timescale запланирована, но ещё не
реализована.

`GET /metrics` отдаёт dev-метрики HTTP, Redis и spread runs. `GET /health`
проверяет только доступность backend process.

## Проверки

Запускать из корня репозитория, если не указано иначе:

```bash
pnpm run test:frontend
pnpm run build
pnpm run lint
pnpm --dir server test
pnpm --dir server build
```

Direct local-bin варианты для ограниченных окружений описаны в `AGENTS.md`.

## Правила разработки

- Никогда не читать, не печатать и не коммитить `.env` или реальные credentials.
- Проверять exchange mappings по официальным docs через `.skills/exchange-docs`.
- Оставлять exchange-specific parsing/signing внутри connectors.
- Выносить reusable constants/helpers на ближайший общий уровень.
- Сохранять partial successes в aggregate endpoints.
- На каждый подтверждённый баг добавлять regression test.
- На неделе рефакторинга выбирать доказуемый cleanup, а не новые фичи.
- Не добавлять live trading до encrypted secrets, paper trading, risk controls,
  kill switch и audit log.

## Что читать дальше

- `AGENTS.md`
- `docs/ROADMAP.md`
- `docs/TECHNICAL_OVERVIEW.md`
- `docs/USER_ACCOUNT_MODEL.md`
- `docs/FEE_DATA_SOURCES.md`
- `docs/MCP.md`
