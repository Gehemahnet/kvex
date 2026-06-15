import type {
	FundingExchange,
	FundingTimeframe,
} from "@api/funding";

export const DEFAULT_FUNDING_TIMEFRAME: FundingTimeframe = "DAY";

export const DEFAULT_FUNDING_EXCHANGES: FundingExchange[] = [
	"hyperliquid",
	"pacifica",
	"ethereal",
	"nado",
	"okx",
	"variational",
];

export const FUNDING_OVERVIEW_ACTIVE_TIMEFRAME_INDEXED_DB_KEY =
	"funding-overview-active-timeframe";

export const FUNDING_OVERVIEW_ACTIVE_EXCHANGES_INDEXED_DB_KEY =
	"funding-overview-active-exchanges";

export const FUNDING_OVERVIEW_PINNED_SYMBOLS_INDEXED_DB_KEY =
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
	{ label: "OKX", value: "okx" },
	{ label: "Variational", value: "variational" },
];

export const FUNDING_TIMEFRAME_OPTIONS = [
	{ label: "Day", value: "DAY" },
	{ label: "Week", value: "WEEK" },
	{ label: "Month", value: "MONTH" },
	{ label: "Year", value: "YEAR" },
];
