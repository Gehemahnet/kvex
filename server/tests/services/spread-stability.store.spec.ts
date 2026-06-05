import { beforeEach, describe, expect, it } from "vitest";
import {
	enrichSpreadStability,
	resetSpreadStability,
} from "../../src/services/spreads/spread-stability.store";
import { SPREAD_STABILITY_RECORD_TTL_MS } from "../../src/services/spreads/spreads.constants";
import type { SpreadOpportunity } from "../../src/services/spreads/spreads.types";

describe("spread stability store", () => {
	beforeEach(() => {
		resetSpreadStability();
	});

	it("tracks occurrence count and lifetime for a directed spread signal", () => {
		const opportunity = createOpportunity();

		expect(enrichSpreadStability(opportunity, 1_000).stability).toEqual({
			firstSeenAt: 1_000,
			lastSeenAt: 1_000,
			occurrences: 1,
			lifetimeMs: 0,
			averagePriceSpread: 1,
			averagePriceSpreadPercent: 0.01,
		});
		expect(enrichSpreadStability(opportunity, 4_000).stability).toEqual({
			firstSeenAt: 1_000,
			lastSeenAt: 4_000,
			occurrences: 2,
			lifetimeMs: 3_000,
			averagePriceSpread: 1,
			averagePriceSpreadPercent: 0.01,
		});
	});

	it("tracks rolling averages for spread metrics", () => {
		const first = enrichSpreadStability(
			createOpportunity({
				priceSpread: 1,
				priceSpreadPercent: 0.01,
				feeAdjustedPriceSpreadPercent: 0.008,
				fundingAprSpread: 0.1,
				estimatedNetSpreadPercent: 0.009,
			}),
			1_000,
		);
		const second = enrichSpreadStability(
			createOpportunity({
				priceSpread: 3,
				priceSpreadPercent: 0.03,
				feeAdjustedPriceSpreadPercent: 0.02,
				fundingAprSpread: 0.3,
				estimatedNetSpreadPercent: 0.024,
			}),
			2_000,
		);

		expect(first.stability?.averagePriceSpreadPercent).toBe(0.01);
		expect(second.stability?.averagePriceSpread).toBe(2);
		expect(second.stability?.averagePriceSpreadPercent).toBeCloseTo(0.02);
		expect(second.stability?.averageFeeAdjustedPriceSpreadPercent).toBeCloseTo(0.014);
		expect(second.stability?.averageFundingAprSpread).toBeCloseTo(0.2);
		expect(second.stability?.averageEstimatedNetSpreadPercent).toBeCloseTo(0.0165);
	});

	it("keeps opposite spread directions as separate signals", () => {
		const first = enrichSpreadStability(createOpportunity(), 1_000);
		const second = enrichSpreadStability(
			createOpportunity({
				longExchange: "okx",
				shortExchange: "hyperliquid",
			}),
			2_000,
		);

		expect(first.stability?.occurrences).toBe(1);
		expect(second.stability?.occurrences).toBe(1);
	});

	it("expires stale stability records", () => {
		const opportunity = createOpportunity();

		expect(enrichSpreadStability(opportunity, 1_000).stability?.occurrences).toBe(1);
		expect(
			enrichSpreadStability(
				opportunity,
				1_000 + SPREAD_STABILITY_RECORD_TTL_MS + 1,
			).stability,
		).toMatchObject({
			occurrences: 1,
			lifetimeMs: 0,
		});
	});
});

const createOpportunity = (
	options: {
		longExchange?: "hyperliquid" | "okx";
		shortExchange?: "hyperliquid" | "okx";
		priceSpread?: number;
		priceSpreadPercent?: number;
		feeAdjustedPriceSpreadPercent?: number;
		fundingAprSpread?: number;
		estimatedNetSpreadPercent?: number;
	} = {},
): SpreadOpportunity => ({
	symbol: "BTC",
	long: {
		exchange: options.longExchange ?? "hyperliquid",
		symbol: "BTC",
		price: 100,
		priceSource: "mark",
	},
	short: {
		exchange: options.shortExchange ?? "okx",
		symbol: "BTC-USDT-SWAP",
		price: 101,
		priceSource: "mark",
	},
	priceSpread: options.priceSpread ?? 1,
	priceSpreadPercent: options.priceSpreadPercent ?? 0.01,
	confidence: 1,
	confidenceBreakdown: {
		priceSource: {
			score: 1,
			weight: 1,
			weightedScore: 1,
			reason: "mark/mark",
		},
		freshness: {
			score: 1,
			weight: 0,
			weightedScore: 0,
			reason: "fresh",
		},
		funding: {
			score: 1,
			weight: 0,
			weightedScore: 0,
			reason: "funding",
		},
		fees: {
			score: 1,
			weight: 0,
			weightedScore: 0,
			reason: "fees",
		},
		liquidity: {
			score: 1,
			weight: 0,
			weightedScore: 0,
			reason: "liquidity",
		},
	},
	isStale: false,
	...(options.feeAdjustedPriceSpreadPercent !== undefined
		? { feeAdjustedPriceSpreadPercent: options.feeAdjustedPriceSpreadPercent }
		: {}),
	...(options.fundingAprSpread !== undefined
		? { fundingAprSpread: options.fundingAprSpread }
		: {}),
	...(options.estimatedNetSpreadPercent !== undefined
		? { estimatedNetSpreadPercent: options.estimatedNetSpreadPercent }
		: {}),
});
