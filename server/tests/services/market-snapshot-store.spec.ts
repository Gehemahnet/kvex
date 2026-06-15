import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CURRENCY } from "../../src/common/constants";

const redisMock = vi.hoisted(() => ({
	client: undefined as
		| {
			mGet: ReturnType<typeof vi.fn>;
			scanIterator: ReturnType<typeof vi.fn>;
			set: ReturnType<typeof vi.fn>;
		}
		| undefined,
	values: new Map<string, string>(),
}));

vi.mock("../../src/common/redis-client", () => ({
	getRedisClient: vi.fn(async () => redisMock.client),
}));

import {
	clearMarketSnapshotStore,
	getStoredMarketSnapshots,
	upsertMarketSnapshot,
	upsertMarketSnapshots,
} from "#services/markets/market-snapshots/market-snapshot-store";

describe("market-snapshot-store", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-04T00:00:00.000Z"));
		clearMarketSnapshotStore();
	});

	afterEach(() => {
		vi.useRealTimers();
		redisMock.client = undefined;
		redisMock.values.clear();
	});

	it("stores and filters market snapshots by exchange and symbol", async () => {
		await upsertMarketSnapshots([
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
			await getStoredMarketSnapshots({
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

	it("merges updates into existing snapshots", async () => {
		await upsertMarketSnapshot({
			exchange: "ethereal",
			symbol: "BTC",
			sourceSymbol: "BTC",
			fundingRate: 0.001,
		});
		await upsertMarketSnapshot({
			exchange: "ethereal",
			symbol: "BTC",
			sourceSymbol: "BTCUSD",
			markPrice: 10,
		});

		expect(
			await getStoredMarketSnapshots({
				exchanges: ["ethereal"],
			}),
		).toEqual([
			{
				exchange: "ethereal",
				symbol: "BTC",
				sourceSymbol: "BTCUSD",
				baseAsset: "BTC",
				quoteAsset: DEFAULT_CURRENCY,
				settlementAsset: DEFAULT_CURRENCY,
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

	it("tracks field-level freshness separately", async () => {
		await upsertMarketSnapshot({
			exchange: "ethereal",
			symbol: "BTC",
			sourceSymbol: "BTC",
			fundingRate: 0.001,
		});

		vi.setSystemTime(new Date("2026-06-04T00:00:05.000Z"));

		await upsertMarketSnapshot({
			exchange: "ethereal",
			symbol: "BTC",
			sourceSymbol: "BTCUSD",
			markPrice: 10,
		});

		expect(
			(await getStoredMarketSnapshots({
				exchanges: ["ethereal"],
			}))[0],
		).toMatchObject({
			receivedAt: 1_780_531_205_000,
			priceReceivedAt: 1_780_531_205_000,
			fundingReceivedAt: 1_780_531_200_000,
		});
	});

	it("persists snapshots to Redis when a client is available", async () => {
		redisMock.client = createRedisClientMock();

		await upsertMarketSnapshot({
			exchange: "okx",
			symbol: "SOL",
			sourceSymbol: "SOL-USDT-SWAP",
			markPrice: 10,
		});

		expect(redisMock.client.set).toHaveBeenCalledWith(
			"kvex:market-snapshot:okx:SOL",
			expect.any(String),
			{ EX: 120 },
		);

		clearMarketSnapshotStore();

		expect(
			await getStoredMarketSnapshots({
				exchanges: ["okx"],
				symbol: "SOL",
			}),
		).toEqual([
			expect.objectContaining({
				exchange: "okx",
				symbol: "SOL",
				sourceSymbol: "SOL-USDT-SWAP",
				markPrice: 10,
			}),
		]);
	});

	it("ignores non-tradable service symbols", async () => {
		redisMock.client = createRedisClientMock();

		await upsertMarketSnapshot({
			exchange: "hyperliquid",
			symbol: "@171",
			sourceSymbol: "@171",
			midPrice: 100,
		});

		expect(
			await getStoredMarketSnapshots({
				exchanges: ["hyperliquid"],
			}),
		).toEqual([]);
		expect(redisMock.client.set).not.toHaveBeenCalled();
	});
});

const createRedisClientMock = () => ({
	set: vi.fn(async (key: string, value: string) => {
		redisMock.values.set(key, value);
	}),
	mGet: vi.fn(async (keys: string[]) =>
		keys.map((key) => redisMock.values.get(key) ?? null),
	),
	scanIterator: vi.fn(async function* ({ MATCH }: { MATCH: string }) {
		const prefix = MATCH.slice(0, -1);

		for (const key of redisMock.values.keys()) {
			if (key.startsWith(prefix)) {
				yield key;
			}
		}
	}),
});
