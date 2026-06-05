export const DEFAULT_SPREAD_MAX_SNAPSHOT_AGE_MS = 30_000;

export const SPREAD_CONFIDENCE_PRICE_SOURCE_SCORE = {
	depth: 1,
	bbo: 1,
	mark: 0.85,
	mid: 0.75,
	index: 0.55,
} as const;

export const SPREAD_CONFIDENCE_BBO_SPREAD = {
	GOOD_PERCENT: 0.001,
	MAX_PERCENT: 0.02,
} as const;

export const SPREAD_CONFIDENCE_WEIGHTS = {
	priceSource: 0.35,
	freshness: 0.25,
	funding: 0.15,
	fees: 0.1,
	liquidity: 0.15,
} as const;

export const SPREAD_CONFIDENCE_MIN_SCORE = 0;

export const SPREAD_CONFIDENCE_MAX_SCORE = 1;

export const SPREAD_STABILITY_RECORD_TTL_MS = 10 * 60 * 1000;
