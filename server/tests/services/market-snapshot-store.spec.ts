import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearMarketSnapshotStore,
	getStoredMarketSnapshots,
	upsertMarketSnapshot,
	upsertMarketSnapshots,
} from "../../src/services/markets/market-snapshot-store";

describe("market-snapshot-store", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-04T00:00:00.000Z"));
		clearMarketSnapshotStore();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("stores and filters market snapshots by exchange and symbol", () => {
		upsertMarketSnapshots([
			{
				exchange: "hyperliquid",
				symbol: "BTC",
				sourceSymbol: "BTC",
				markPrice: 100,
			},
			{
				exchange: "pacifica",
				symbol: "ETH",
				sourceSymbol: "ETH",
				markPrice: 200,
			},
		]);

		expect(
			getStoredMarketSnapshots({
				exchanges: ["hyperliquid", "pacifica"],
				symbol: "BTC",
			}),
		).toEqual([
			{
				exchange: "hyperliquid",
				symbol: "BTC",
				sourceSymbol: "BTC",
				baseAsset: "BTC",
				contractType: "unknown",
				assetClass: "unknown",
				markPrice: 100,
				receivedAt: 1_780_531_200_000,
				priceReceivedAt: 1_780_531_200_000,
			},
		]);
	});

	it("merges updates into existing snapshots", () => {
		upsertMarketSnapshot({
			exchange: "ethereal",
			symbol: "BTC",
			sourceSymbol: "BTC",
			fundingRate: 0.001,
		});
		upsertMarketSnapshot({
			exchange: "ethereal",
			symbol: "BTC",
			sourceSymbol: "BTCUSD",
			markPrice: 10,
		});

		expect(
			getStoredMarketSnapshots({
				exchanges: ["ethereal"],
			}),
		).toEqual([
			{
				exchange: "ethereal",
				symbol: "BTC",
				sourceSymbol: "BTCUSD",
				baseAsset: "BTC",
				quoteAsset: "USD",
				settlementAsset: "USD",
				contractType: "unknown",
				assetClass: "unknown",
				fundingRate: 0.001,
				markPrice: 10,
				receivedAt: 1_780_531_200_000,
				priceReceivedAt: 1_780_531_200_000,
				fundingReceivedAt: 1_780_531_200_000,
			},
		]);
	});

	it("tracks field-level freshness separately", () => {
		upsertMarketSnapshot({
			exchange: "ethereal",
			symbol: "BTC",
			sourceSymbol: "BTC",
			fundingRate: 0.001,
		});

		vi.setSystemTime(new Date("2026-06-04T00:00:05.000Z"));

		upsertMarketSnapshot({
			exchange: "ethereal",
			symbol: "BTC",
			sourceSymbol: "BTCUSD",
			markPrice: 10,
		});

		expect(
			getStoredMarketSnapshots({
				exchanges: ["ethereal"],
			})[0],
		).toMatchObject({
			receivedAt: 1_780_531_205_000,
			priceReceivedAt: 1_780_531_205_000,
			fundingReceivedAt: 1_780_531_200_000,
		});
	});
});
