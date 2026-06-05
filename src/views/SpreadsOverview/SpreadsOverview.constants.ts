import type { FundingExchange } from "../FundingOverview/FundingOverview.types";

export const DEFAULT_SPREADS_EXCHANGES: FundingExchange[] = [
	"hyperliquid",
	"pacifica",
	"ethereal",
	"nado",
	"okx",
];

export const SPREADS_ACTIVE_EXCHANGES_LOCAL_STORAGE_KEY =
	"spreads-active-exchanges";

export const SPREADS_SYMBOL_SEARCH_LOCAL_STORAGE_KEY = "spreads-symbol-search";

export const SPREADS_MIN_PRICE_SPREAD_LOCAL_STORAGE_KEY =
	"spreads-min-price-spread-percent";

export const SPREADS_MAX_SNAPSHOT_AGE_LOCAL_STORAGE_KEY =
	"spreads-max-snapshot-age-ms";

export const SPREADS_MIN_CONFIDENCE_LOCAL_STORAGE_KEY =
	"spreads-min-confidence";

export const SPREADS_POSITION_SIZE_LOCAL_STORAGE_KEY = "spreads-position-size-usd";

export const SPREADS_MIN_OCCURRENCES_LOCAL_STORAGE_KEY =
	"spreads-min-occurrences";

export const SPREADS_MIN_LIFETIME_LOCAL_STORAGE_KEY =
	"spreads-min-lifetime-ms";

export const SPREADS_HOLDING_PERIOD_LOCAL_STORAGE_KEY =
	"spreads-holding-period-hours";

export const SPREADS_HIDE_STALE_LOCAL_STORAGE_KEY = "spreads-hide-stale";

export const SPREADS_ONLY_FEE_ADJUSTED_LOCAL_STORAGE_KEY =
	"spreads-only-fee-adjusted";

export const SPREADS_ROWS_PER_PAGE_LOCAL_STORAGE_KEY =
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
