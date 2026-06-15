import { describe, expect, it } from "vitest";
import { DEFAULT_CURRENCY } from "../../src/common/constants";
import { createSpreadOpportunity } from "#services/spreads/spreads-core/spreads.utils";

describe("spread utils", () => {
	it("creates a price spread opportunity from two snapshots", () => {
		const opportunity = createSpreadOpportunity(
			{
				exchange: "hyperliquid",
				symbol: "BTC",
				sourceSymbol: "BTC",
				markPrice: 100,
				fundingRate: 0.0001,
				fundingApr: 0.1,
				takerFeeRate: 0.001,
				feeSource: "api",
				openInterest: 1_000,
				volume24h: 10_000,
				timestamp: 1_000,
				receivedAt: 1_500,
			},
			{
				exchange: "pacifica",
				symbol: "BTC",
				sourceSymbol: "BTC",
				markPrice: 105,
				fundingRate: -0.0002,
				fundingApr: -0.2,
				takerFeeRate: 0.002,
				feeSource: "api",
				openInterest: 2_000,
				volume24h: 20_000,
				timestamp: 1_000,
				receivedAt: 1_500,
			},
			{ now: 2_000, holdingPeriodHours: 8 },
		);

		expect(opportunity).toEqual({
			symbol: "BTC",
			long: {
				exchange: "hyperliquid",
				symbol: "BTC",
				price: 100,
				priceSource: "mark",
				fundingRate: 0.0001,
				fundingApr: 0.1,
				takerFeeRate: 0.001,
				feeSource: "api",
				timestamp: 1_000,
				receivedAt: 1_500,
				ageMs: 500,
				priceAgeMs: 500,
				fundingAgeMs: 500,
				liquidityAgeMs: 500,
			},
			short: {
				exchange: "pacifica",
				symbol: "BTC",
				price: 105,
				priceSource: "mark",
				fundingRate: -0.0002,
				fundingApr: -0.2,
				takerFeeRate: 0.002,
				feeSource: "api",
				timestamp: 1_000,
				receivedAt: 1_500,
				ageMs: 500,
				priceAgeMs: 500,
				fundingAgeMs: 500,
				liquidityAgeMs: 500,
			},
			priceSpread: 5,
			priceSpreadPercent: 0.05,
			confidence: expect.any(Number),
			confidenceBreakdown: {
				priceSource: {
					score: 0.85,
					weight: 0.35,
					weightedScore: 0.2975,
					reason: "mark/mark",
				},
				freshness: {
					score: expect.any(Number),
					weight: 0.25,
					weightedScore: expect.any(Number),
					reason: "Ages 500ms / 500ms, max 30000ms",
				},
				funding: {
					score: 1,
					weight: 0.15,
					weightedScore: 0.15,
					reason: "Both sides have funding APR",
				},
				fees: {
					score: 1,
					weight: 0.1,
					weightedScore: 0.1,
					reason: "Both sides have API taker fees",
				},
				liquidity: {
					score: 0.5,
					weight: 0.15,
					weightedScore: 0.075,
					reason: "OI+24h volume / OI+24h volume",
				},
			},
			isStale: false,
			maxExecutableNotionalReason: "missing-long-ask",
			feeAdjustedPriceSpreadPercent: 0.047,
			fundingAprSpread: expect.any(Number),
			fundingImpactPercent: expect.any(Number),
			estimatedNetSpreadPercent: expect.any(Number),
		});
		expect(opportunity?.fundingAprSpread).toBeCloseTo(-0.3);
		expect(opportunity?.fundingImpactPercent).toBeCloseTo(-0.0024);
		expect(opportunity?.estimatedNetSpreadPercent).toBeCloseTo(0.0446);
		expect(opportunity?.confidence).toBeCloseTo(0.8683, 4);
		expect(opportunity?.confidenceBreakdown.freshness.score).toBeCloseTo(0.9833, 4);
		expect(opportunity?.confidenceBreakdown.freshness.weightedScore).toBeCloseTo(0.2458, 4);
	});

	it("scores liquidity higher when both sides expose depth and liquidity metadata", () => {
		const opportunity = createSpreadOpportunity(
			{
				exchange: "hyperliquid",
				symbol: "BTC",
				sourceSymbol: "BTC",
				bidPrice: 99,
				bidSize: 2,
				askPrice: 100,
				askSize: 2,
				orderBookBids: [{ price: 99, size: 2 }],
				orderBookAsks: [{ price: 100, size: 2 }],
				openInterest: 1_000,
				volume24h: 10_000,
				receivedAt: 1_000,
			},
			{
				exchange: "okx",
				symbol: "BTC",
				sourceSymbol: "BTC-USDT-SWAP",
				bidPrice: 104,
				bidSize: 2,
				askPrice: 105,
				askSize: 2,
				orderBookBids: [{ price: 104, size: 2 }],
				orderBookAsks: [{ price: 105, size: 2 }],
				openInterest: 2_000,
				volume24h: 20_000,
				receivedAt: 1_000,
			},
			{ now: 1_000 },
		);

		expect(opportunity?.confidenceBreakdown.liquidity).toEqual({
			score: 1,
			weight: 0.15,
			weightedScore: 0.15,
			reason: "depth 1x1+OI+24h volume / depth 1x1+OI+24h volume",
		});
	});

	it("marks stale opportunities when snapshots are missing or older than max age", () => {
		const opportunity = createSpreadOpportunity(
			{
				exchange: "hyperliquid",
				symbol: "BTC",
				sourceSymbol: "BTC",
				midPrice: 100,
				timestamp: 1_000,
				receivedAt: 1_000,
			},
			{
				exchange: "pacifica",
				symbol: "BTC",
				sourceSymbol: "BTC",
				indexPrice: 105,
			},
			{
				now: 2_000,
				maxSnapshotAgeMs: 500,
			},
		);

		expect(opportunity?.isStale).toBe(true);
		expect(opportunity?.confidence).toBe(0.22749999999999998);
		expect(opportunity?.long.priceSource).toBe("mid");
		expect(opportunity?.short.priceSource).toBe("index");
	});

	it("uses price freshness instead of generic snapshot freshness for stale checks", () => {
		const opportunity = createSpreadOpportunity(
			{
				exchange: "hyperliquid",
				symbol: "BTC",
				sourceSymbol: "BTC",
				markPrice: 100,
				receivedAt: 2_000,
				priceReceivedAt: 1_000,
			},
			{
				exchange: "okx",
				symbol: "BTC",
				sourceSymbol: "BTC-USDT-SWAP",
				markPrice: 101,
				receivedAt: 2_000,
				priceReceivedAt: 1_000,
			},
			{
				now: 2_000,
				maxSnapshotAgeMs: 500,
			},
		);

		expect(opportunity?.isStale).toBe(true);
		expect(opportunity?.long.ageMs).toBe(1_000);
		expect(opportunity?.long.priceAgeMs).toBe(1_000);
	});

	it("uses executable bid and ask prices before indicative mark prices", () => {
		const opportunity = createSpreadOpportunity(
			{
				exchange: "hyperliquid",
				symbol: "BTC",
				sourceSymbol: "BTC",
				bidPrice: 99,
				bidSize: 2,
				askPrice: 101,
				askSize: 3,
				markPrice: 100,
				receivedAt: 1_000,
			},
			{
				exchange: "okx",
				symbol: "BTC",
				sourceSymbol: "BTC-USDT-SWAP",
				bidPrice: 104,
				bidSize: 4,
				askPrice: 106,
				askSize: 5,
				markPrice: 102,
				receivedAt: 1_000,
			},
			{ now: 1_000 },
		);

		expect(opportunity?.long).toMatchObject({
			exchange: "hyperliquid",
			price: 101,
			priceSource: "bbo",
			bidPrice: 99,
			askPrice: 101,
			bidSize: 2,
			askSize: 3,
		});
		expect(opportunity?.short).toMatchObject({
			exchange: "okx",
			price: 104,
			priceSource: "bbo",
			bidPrice: 104,
			askPrice: 106,
			bidSize: 4,
			askSize: 5,
		});
		expect(opportunity?.priceSpreadPercent).toBeCloseTo(3 / 101);
		expect(opportunity?.maxExecutableNotionalUsd).toBe(303);
		expect(opportunity?.maxExecutableNotionalReason).toBe("available");
		expect(opportunity?.confidenceBreakdown.priceSource.reason).toBe(
			"bbo/bbo, BBO spreads 2.000% / 1.905%",
		);
	});

	it("filters out opportunities that cannot satisfy the requested top-of-book notional", () => {
		const first = {
			exchange: "hyperliquid" as const,
			symbol: "BTC",
			sourceSymbol: "BTC",
			bidPrice: 99,
			bidSize: 2,
			askPrice: 101,
			askSize: 3,
			receivedAt: 1_000,
		};
		const second = {
			exchange: "okx" as const,
			symbol: "BTC",
			sourceSymbol: "BTC-USDT-SWAP",
			bidPrice: 104,
			bidSize: 4,
			askPrice: 106,
			askSize: 5,
			receivedAt: 1_000,
		};

		expect(
			createSpreadOpportunity(first, second, {
				now: 1_000,
				positionSizeUsd: 300,
			}),
		).toBeDefined();
		expect(
			createSpreadOpportunity(first, second, {
				now: 1_000,
				positionSizeUsd: 304,
			}),
		).toBeUndefined();
	});

	it("uses order book depth to compute execution prices for requested position size", () => {
		const opportunity = createSpreadOpportunity(
			{
				exchange: "hyperliquid",
				symbol: "BTC",
				sourceSymbol: "BTC",
				bidPrice: 99,
				bidSize: 2,
				askPrice: 100,
				askSize: 1,
				orderBookAsks: [
					{ price: 100, size: 1 },
					{ price: 110, size: 1 },
				],
				receivedAt: 1_000,
			},
			{
				exchange: "okx",
				symbol: "BTC",
				sourceSymbol: "BTC-USDT-SWAP",
				bidPrice: 120,
				bidSize: 1,
				orderBookBids: [
					{ price: 120, size: 1 },
					{ price: 110, size: 1 },
				],
				askPrice: 121,
				askSize: 1,
				receivedAt: 1_000,
			},
			{
				now: 1_000,
				positionSizeUsd: 150,
			},
		);

		expect(opportunity?.long.priceSource).toBe("depth");
		expect(opportunity?.short.priceSource).toBe("depth");
		expect(opportunity?.long.price).toBeCloseTo(150 / (1 + 50 / 110));
		expect(opportunity?.short.price).toBeCloseTo(150 / (1 + 30 / 110));
		expect(opportunity?.maxExecutableNotionalUsd).toBe(210);
		expect(opportunity?.executionSlippagePercent).toBeGreaterThan(0);
	});

	it("explains why top-of-book notional is missing", () => {
		const opportunity = createSpreadOpportunity(
			{
				exchange: "hyperliquid",
				symbol: "BTC",
				sourceSymbol: "BTC",
				bidPrice: 99,
				askPrice: 101,
				markPrice: 100,
			},
			{
				exchange: "okx",
				symbol: "BTC",
				sourceSymbol: "BTC-USDT-SWAP",
				bidPrice: 104,
				bidSize: 4,
				askPrice: 106,
				askSize: 5,
				markPrice: 102,
			},
		);

		expect(opportunity?.maxExecutableNotionalUsd).toBeUndefined();
		expect(opportunity?.maxExecutableNotionalReason).toBe("missing-long-ask-size");
	});

	it("falls back to indicative prices when BBO is crossed", () => {
		const opportunity = createSpreadOpportunity(
			{
				exchange: "hyperliquid",
				symbol: "BTC",
				sourceSymbol: "BTC",
				bidPrice: 102,
				askPrice: 101,
				markPrice: 100,
			},
			{
				exchange: "okx",
				symbol: "BTC",
				sourceSymbol: "BTC-USDT-SWAP",
				bidPrice: 104,
				askPrice: 106,
				markPrice: 105,
			},
		);

		expect(opportunity?.long.priceSource).toBe("mark");
		expect(opportunity?.short.priceSource).toBe("mark");
	});

	it("scores documented fee fallbacks lower than API fee rates", () => {
		const opportunity = createSpreadOpportunity(
			{
				exchange: "hyperliquid",
				symbol: "BTC",
				sourceSymbol: "BTC",
				markPrice: 100,
				takerFeeRate: 0.00045,
				feeSource: "documentation",
				timestamp: 1_000,
				receivedAt: 1_000,
			},
			{
				exchange: "okx",
				symbol: "BTC",
				sourceSymbol: "BTC-USDT-SWAP",
				markPrice: 101,
				takerFeeRate: 0.0005,
				feeSource: "documentation",
				timestamp: 1_000,
				receivedAt: 1_000,
			},
			{ now: 1_000 },
		);

		expect(opportunity?.confidenceBreakdown.fees).toEqual({
			score: 0.6,
			weight: 0.1,
			weightedScore: 0.06,
			reason: "Fee sources documentation / documentation",
		});
	});

	it("ignores snapshots without comparable symbols or prices", () => {
		expect(
			createSpreadOpportunity(
				{ exchange: "hyperliquid", symbol: "BTC", sourceSymbol: "BTC" },
				{
					exchange: "pacifica",
					symbol: "ETH",
					sourceSymbol: "ETH",
					markPrice: 100,
				},
			),
		).toBeUndefined();
	});

	it("ignores snapshots with incompatible market identity", () => {
		expect(
			createSpreadOpportunity(
				{
					exchange: "hyperliquid",
					symbol: "SOL",
					sourceSymbol: "SOL",
					baseAsset: "SOL",
					quoteAsset: DEFAULT_CURRENCY,
					settlementAsset: DEFAULT_CURRENCY,
					markPrice: 100,
				},
				{
					exchange: "okx",
					symbol: "SOL",
					sourceSymbol: "SOL-USDC-SWAP",
					baseAsset: "SOL",
					quoteAsset: "USDC",
					settlementAsset: "USDC",
					markPrice: 101,
				},
			),
		).toBeUndefined();
	});

	it("ignores known non-crypto synthetic markets", () => {
		expect(
			createSpreadOpportunity(
				{
					exchange: "nado",
					symbol: "AAPL",
					sourceSymbol: "AAPL",
					baseAsset: "AAPL",
					assetClass: "equity",
					markPrice: 100,
				},
				{
					exchange: "okx",
					symbol: "AAPL",
					sourceSymbol: "AAPL-USDT-SWAP",
					baseAsset: "AAPL",
					quoteAsset: "USDT",
					settlementAsset: "USDT",
					assetClass: "equity",
					markPrice: 101,
				},
			),
		).toBeUndefined();
	});

	it("ignores known synthetic commodity-like markets", () => {
		expect(
			createSpreadOpportunity(
				{
					exchange: "pacifica",
					symbol: "XAU",
					sourceSymbol: "XAU",
					baseAsset: "XAU",
					assetClass: "synthetic",
					markPrice: 4_450,
				},
				{
					exchange: "okx",
					symbol: "XAU",
					sourceSymbol: "XAU-USDT-SWAP",
					baseAsset: "XAU",
					quoteAsset: "USDT",
					settlementAsset: "USDT",
					assetClass: "synthetic",
					markPrice: 4_456,
				},
			),
		).toBeUndefined();
	});

	it("allows comparison when one side does not expose quote identity yet", () => {
		expect(
			createSpreadOpportunity(
				{
					exchange: "hyperliquid",
					symbol: "SOL",
					sourceSymbol: "SOL",
					baseAsset: "SOL",
					markPrice: 100,
				},
				{
					exchange: "okx",
					symbol: "SOL",
					sourceSymbol: "SOL-USDT-SWAP",
					baseAsset: "SOL",
					quoteAsset: "USDT",
					settlementAsset: "USDT",
					markPrice: 101,
				},
			),
		).toBeDefined();
	});
});
