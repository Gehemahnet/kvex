import type {
	FundingExchange,
	FundingTimeframe,
} from "./FundingOverview.types";

export const FUNDING_INTERVALS = [
	{ label: "1h", multiplier: 1 },
	{ label: "4h", multiplier: 4 },
	{ label: "8h", multiplier: 8 },
	{ label: "12h", multiplier: 12 },
	{ label: "1d", multiplier: 24 },
	{ label: "3d", multiplier: 72 },
	{ label: "7d", multiplier: 168 },
	{ label: "1y", multiplier: 8760 },
];

export const DEFAULT_FUNDING_TIMEFRAME: FundingTimeframe = "DAY";

export const DEFAULT_FUNDING_EXCHANGES: FundingExchange[] = [
	"hyperliquid",
	"pacifica",
	"ethereal",
	"nado",
];

export const FUNDING_OVERVIEW_ACTIVE_TIMEFRAME_LOCAL_STORAGE_KEY =
	"funding-overview-active-timeframe";

export const FUNDING_OVERVIEW_ACTIVE_EXCHANGES_LOCAL_STORAGE_KEY =
	"funding-overview-active-exchanges";

export const FUNDING_OVERVIEW_PINNED_SYMBOLS_LOCAL_STORAGE_KEY =
	"funding-overview-pinned-symbols";

export const FUNDING_OVERVIEW_INITIAL_VISIBLE_ROWS = 50;

export const FUNDING_OVERVIEW_ROWS_INCREMENT = 50;

export const FUNDING_OVERVIEW_SCROLL_LOAD_OFFSET_PX = 160;

export const FUNDING_OVERVIEW_CACHE_TTL_MS = 3 * 60 * 1000;

export const FUNDING_EXCHANGE_OPTIONS = [
	{ label: "Hyperliquid", value: "hyperliquid" },
	{ label: "Pacifica", value: "pacifica" },
	{ label: "Ethereal", value: "ethereal" },
	{ label: "Nado", value: "nado" },
];

export const FUNDING_TIMEFRAME_OPTIONS = [
	{ label: "Day", value: "DAY" },
	{ label: "Week", value: "WEEK" },
	{ label: "Month", value: "MONTH" },
	{ label: "Year", value: "YEAR" },
];
