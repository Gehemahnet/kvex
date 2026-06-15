import { Exchange, Period } from "#common/types";

export const SUPPORTED_FUNDING_EXCHANGES: Exchange[] = [
	"hyperliquid",
	"pacifica",
	"ethereal",
	"nado",
	"okx",
	"variational",
];

export const SUPPORTED_ETHEREAL_PERIODS: Period[] = ["DAY", "WEEK", "MONTH"];

export const FUNDING_OVERVIEW_MARKETS_CACHE_TTL_MS = 10 * 60 * 1000;

export const FUNDING_OVERVIEW_RESPONSE_CACHE_TTL_MS = 60 * 1000;

export const FUNDING_HOURS_PER_YEAR = 24 * 365;

export const FUNDING_INTERVAL_HOURS = {
	ETHEREAL: 1,
	HYPERLIQUID: 1,
	NADO: 24,
	OKX_FALLBACK: 8,
	PACIFICA: 1,
} as const;

export const DOCUMENTED_BASE_PERP_FEES: Partial<Record<
	Exchange,
	{
		makerFeeRate: number;
		takerFeeRate: number;
	}
>> = {
	hyperliquid: {
		makerFeeRate: 0.00015,
		takerFeeRate: 0.00045,
	},
	pacifica: {
		makerFeeRate: 0.00015,
		takerFeeRate: 0.0004,
	},
	okx: {
		makerFeeRate: 0.0002,
		takerFeeRate: 0.0005,
	},
};
