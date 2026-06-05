import { describe, expect, it } from "vitest";
import { createSpreadsQueryKey } from "./SpreadsOverview.query";

describe("SpreadsOverview query", () => {
	it("creates stable cache keys from spread filters", () => {
		expect(
			createSpreadsQueryKey({
				exchanges: ["hyperliquid", "okx"],
				symbol: " btc ",
				minPriceSpreadPercent: 0.01,
				maxSnapshotAgeMs: 30_000,
				positionSizeUsd: 1_000,
				minOccurrences: 2.9,
				minLifetimeMs: 5_000,
				holdingPeriodHours: 8,
			}),
		).toEqual([
			"spreads",
			"hyperliquid,okx",
			"BTC",
			0.01,
			30_000,
			1_000,
			2,
			5_000,
			8,
		]);
	});

	it("normalizes disabled numeric filters out of cache keys", () => {
		expect(
			createSpreadsQueryKey({
				exchanges: ["hyperliquid", "okx"],
				symbol: "",
				minPriceSpreadPercent: 0,
				maxSnapshotAgeMs: 30_000,
				positionSizeUsd: 0,
				minOccurrences: 0,
				minLifetimeMs: 0,
				holdingPeriodHours: 0,
			}),
		).toEqual([
			"spreads",
			"hyperliquid,okx",
			"",
			0,
			30_000,
			undefined,
			undefined,
			undefined,
			undefined,
		]);
	});

	it("separates cache entries by holding period", () => {
		const baseParams = {
			exchanges: ["hyperliquid", "okx"] as const,
			symbol: "BTC",
			minPriceSpreadPercent: 0,
			maxSnapshotAgeMs: 30_000,
			positionSizeUsd: 1_000,
			minOccurrences: 0,
			minLifetimeMs: 0,
		};

		expect(
			createSpreadsQueryKey({
				...baseParams,
				holdingPeriodHours: 8,
			}),
		).not.toEqual(
			createSpreadsQueryKey({
				...baseParams,
				holdingPeriodHours: 24,
			}),
		);
	});
});
