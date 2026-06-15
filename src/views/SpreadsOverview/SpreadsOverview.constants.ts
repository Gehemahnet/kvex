import type { FundingExchange } from "@api/funding";

export const DEFAULT_SPREADS_EXCHANGES: FundingExchange[] = [
	"hyperliquid",
	"pacifica",
	"ethereal",
	"nado",
	"okx",
	"variational",
];

export const SPREADS_FILTERS_INDEXED_DB_KEY = "spreads-filters";

export const SPREADS_SYMBOL_SEARCH_INDEXED_DB_KEY = "spreads-symbol-search";
export const SPREADS_ROWS_PER_PAGE_INDEXED_DB_KEY =
	"spreads-rows-per-page";

export const DEFAULT_SPREADS_MAX_SNAPSHOT_AGE_MS = 120_000;

export const DEFAULT_SPREADS_MIN_PRICE_SPREAD_PERCENT = 0;

export const DEFAULT_SPREADS_MIN_CONFIDENCE = 0;

export const DEFAULT_SPREADS_POSITION_SIZE_USD = 0;

export const DEFAULT_SPREADS_MIN_OCCURRENCES = 0;

export const DEFAULT_SPREADS_MIN_LIFETIME_MS = 0;

export const DEFAULT_SPREADS_HOLDING_PERIOD_HOURS = 8;

export const DEFAULT_SPREADS_HIDE_STALE = false;

export const DEFAULT_SPREADS_ONLY_FEE_ADJUSTED = false;

export const DEFAULT_SPREADS_ROWS_PER_PAGE = 25;

export const SPREADS_ROWS_PER_PAGE_OPTIONS = [25, 50, 100];

export const SPREADS_CACHE_TTL_MS = 15_000;
