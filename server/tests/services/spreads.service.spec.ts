import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketSnapshot } from "#services/markets/market-snapshots/market-snapshots.types";
import { getMarketSnapshots } from "#services/markets/market-snapshots/market-snapshots.service";
import { resetSpreadStability } from "#services/spreads/spread-stability/spread-stability.store";
import { getSpreads } from "#services/spreads/spreads-core/spreads.service";

vi.mock("#services/markets/market-snapshots/market-snapshots.service", () => ({
	getMarketSnapshots: vi.fn(),
}));

describe("spreads service", () => {
	beforeEach(() => {
		resetSpreadStability();
		vi.useFakeTimers();
		vi.mocked(getMarketSnapshots).mockResolvedValue({
			exchanges: ["hyperliquid", "okx"],
			data: createMarketSnapshots(),
			errors: [],
		});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it("filters opportunities by minimum signal lifetime", async () => {
		vi.setSystemTime(1_000);

		await expect(
			getSpreads({
				exchanges: ["hyperliquid", "okx"],
				minLifetimeMs: 1_000,
			}),
		).resolves.toMatchObject({
			data: [],
		});

		vi.setSystemTime(2_500);

		const response = await getSpreads({
			exchanges: ["hyperliquid", "okx"],
			minLifetimeMs: 1_000,
		});

		expect(response.data).toHaveLength(1);
		expect(response.data[0]?.stability).toMatchObject({
			occurrences: 2,
			lifetimeMs: 1_500,
		});
	});

	it("sorts opportunities by estimated net spread when holding period is provided", async () => {
		vi.mocked(getMarketSnapshots).mockResolvedValue({
			exchanges: ["hyperliquid", "okx"],
			data: [
				createMarketSnapshot({
					symbol: "BTC",
					exchange: "hyperliquid",
					markPrice: 100,
					fundingRate: 0,
				}),
				createMarketSnapshot({
					symbol: "BTC",
					exchange: "okx",
					sourceSymbol: "BTC-USDT-SWAP",
					markPrice: 102,
					fundingRate: 0,
				}),
				createMarketSnapshot({
					symbol: "ETH",
					exchange: "hyperliquid",
					markPrice: 100,
					fundingRate: -0.01,
				}),
				createMarketSnapshot({
					symbol: "ETH",
					exchange: "okx",
					sourceSymbol: "ETH-USDT-SWAP",
					markPrice: 101,
					fundingRate: 0.01,
				}),
			],
			errors: [],
		});

		const response = await getSpreads({
			exchanges: ["hyperliquid", "okx"],
			holdingPeriodHours: 1,
		});

		expect(response.data.map((opportunity) => opportunity.symbol)).toEqual([
			"ETH",
			"BTC",
		]);
		expect(response.data[0]?.estimatedNetSpreadPercent).toBeCloseTo(0.028);
	});

	it("returns compact table rows without internal market snapshot fields", async () => {
		vi.setSystemTime(1_000);

		const response = await getSpreads({
			exchanges: ["hyperliquid", "okx"],
		});

		expect(response.data[0]?.long).toEqual({
			exchange: "hyperliquid",
			price: 100,
			priceSource: "mark",
			ageMs: 0,
		});
		expect(response.data[0]?.long).not.toHaveProperty("symbol");
		expect(response.data[0]?.long).not.toHaveProperty("fundingRate");
		expect(response.data[0]?.long).not.toHaveProperty("receivedAt");
		expect(response.data[0]?.confidenceBreakdown.priceSource).not.toHaveProperty(
			"weightedScore",
		);
	});
});

const createMarketSnapshots = (): MarketSnapshot[] => [
	{
		exchange: "hyperliquid",
		symbol: "BTC",
		sourceSymbol: "BTC",
		markPrice: 100,
		receivedAt: 1_000,
	},
	{
		exchange: "okx",
		symbol: "BTC",
		sourceSymbol: "BTC-USDT-SWAP",
		markPrice: 102,
		receivedAt: 1_000,
	},
];

const createMarketSnapshot = (
	options: {
		exchange: "hyperliquid" | "okx";
		fundingRate: number;
		markPrice: number;
		sourceSymbol?: string;
		symbol: string;
	},
): MarketSnapshot => ({
	exchange: options.exchange,
	symbol: options.symbol,
	sourceSymbol: options.sourceSymbol ?? options.symbol,
	markPrice: options.markPrice,
	fundingRate: options.fundingRate,
	fundingApr: options.fundingRate * 24 * 365,
	takerFeeRate: 0.001,
	feeSource: "api",
	receivedAt: 1_000,
});
