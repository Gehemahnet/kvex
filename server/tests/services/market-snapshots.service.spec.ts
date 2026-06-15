import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/common/redis-client", () => ({
	getRedisClient: vi.fn(async () => undefined),
}));

vi.mock("#services/funding/funding-overview/funding-overview.service", () => ({
	getFundingOverviewExchangeCells: vi.fn(),
}));

import { getFundingOverviewExchangeCells } from "#services/funding/funding-overview/funding-overview.service";
import { getMarketSnapshots } from "#services/markets/market-snapshots/market-snapshots.service";
import { clearMarketSnapshotStore } from "#services/markets/market-snapshots/market-snapshot-store";

describe("market snapshots service", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-04T00:00:00.000Z"));
		clearMarketSnapshotStore();
		vi.mocked(getFundingOverviewExchangeCells).mockReset();
	});

	it("bootstraps snapshots once and reuses fresh hydrated cache", async () => {
		vi.mocked(getFundingOverviewExchangeCells).mockResolvedValue({
			exchanges: ["hyperliquid", "okx"],
			data: [
				{
					exchange: "hyperliquid",
					sourceSymbol: "BTC",
					markPrice: 100,
				},
				{
					exchange: "okx",
					sourceSymbol: "BTC-USDT-SWAP",
					markPrice: 101,
				},
			],
			errors: [],
		});

		const firstResponse = await getMarketSnapshots({
			exchanges: ["hyperliquid", "okx"],
		});
		const secondResponse = await getMarketSnapshots({
			exchanges: ["hyperliquid", "okx"],
		});

		expect(getFundingOverviewExchangeCells).toHaveBeenCalledTimes(1);
		expect(firstResponse.data).toHaveLength(2);
		expect(secondResponse.data).toEqual(firstResponse.data);
	});

	it("refreshes hydrated cache when all snapshots are stale", async () => {
		vi.mocked(getFundingOverviewExchangeCells)
			.mockResolvedValueOnce({
				exchanges: ["hyperliquid"],
				data: [
					{
						exchange: "hyperliquid",
						sourceSymbol: "BTC",
						markPrice: 100,
					},
				],
				errors: [],
			})
			.mockResolvedValueOnce({
				exchanges: ["hyperliquid"],
				data: [
					{
						exchange: "hyperliquid",
						sourceSymbol: "BTC",
						markPrice: 101,
					},
				],
				errors: [],
			});

		await getMarketSnapshots({
			exchanges: ["hyperliquid"],
		});

		vi.setSystemTime(new Date("2026-06-04T00:02:01.000Z"));

		const response = await getMarketSnapshots({
			exchanges: ["hyperliquid"],
		});

		expect(getFundingOverviewExchangeCells).toHaveBeenCalledTimes(2);
		expect(response.data[0]?.markPrice).toBe(101);
	});
});
