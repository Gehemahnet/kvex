import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/exchanges/variational/variational", () => ({
	variationalClient: {
		getStats: vi.fn(),
	},
}));

import { clearMemoryCache } from "../../src/common/cache.utils";
import { variationalClient } from "../../src/exchanges/variational/variational";
import { getFunding } from "#services/funding/funding-core/funding.service";
import { getFundingOverview } from "#services/funding/funding-overview/funding-overview.service";

describe("variational funding integration", () => {
	beforeEach(() => {
		clearMemoryCache();
		vi.mocked(variationalClient.getStats).mockReset();
		vi.mocked(variationalClient.getStats).mockResolvedValue({
			listings: [
				{
					ticker: "BTC",
					mark_price: "93787.96",
					volume_24h: "1058107020.46",
					open_interest: {
						long_open_interest: "113883049.01",
						short_open_interest: "82403040.52",
					},
					funding_rate: "0.0008",
					funding_interval_s: 28800,
					quotes: {
						updated_at: "2026-01-06T06:38:52.476Z",
						size_1k: {
							bid: "93750.97",
							ask: "93755.01",
						},
					},
				},
			],
		});
	});

	it("adapts current interval funding into funding series timeframes", async () => {
		const response = await getFunding({
			symbol: "BTC",
			timeframe: "DAY",
			exchanges: ["variational"],
		});

		expect(response.errors).toEqual([]);
		expect(response.data[0]).toMatchObject({
			exchange: "variational",
			symbol: "BTC",
			sourceSymbol: "BTC",
			isFundingAdapted: true,
			requestedTimeframe: "DAY",
			sourceTimeframe: "DAY",
			latest: {
				fundingRate: 0.0024000000000000002,
			},
		});
	});

	it("maps stats listings into funding overview cells", async () => {
		const response = await getFundingOverview({
			timeframe: "DAY",
			exchanges: ["variational"],
		});

		expect(response.errors).toEqual([]);
		expect(response.data).toEqual([
			{
				symbol: "BTC",
				exchanges: {
					variational: {
						exchange: "variational",
						sourceSymbol: "BTC",
						fundingRate: 0.0024000000000000002,
						fundingIntervalHours: 8,
						apr: 0.876,
						timestamp: Date.parse("2026-01-06T06:38:52.476Z"),
					},
				},
			},
		]);
	});
});
