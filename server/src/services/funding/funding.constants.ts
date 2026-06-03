import { Exchange, Period } from "../../common/types";

export const SUPPORTED_FUNDING_EXCHANGES: Exchange[] = [
	"hyperliquid",
	"pacifica",
	"ethereal",
];

export const SUPPORTED_ETHEREAL_PERIODS: Period[] = ["DAY", "WEEK", "MONTH"];

export const FUNDING_OVERVIEW_MARKETS_CACHE_TTL_MS = 10 * 60 * 1000;

export const FUNDING_OVERVIEW_RESPONSE_CACHE_TTL_MS = 60 * 1000;

export const FUNDING_HOURS_PER_YEAR = 24 * 365;
