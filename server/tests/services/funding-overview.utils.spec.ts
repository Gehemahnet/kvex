import { describe, expect, it } from "vitest";
import type { FundingOverviewExchangeCell } from "#services/funding/funding-overview/funding-overview.types";
import {
	annualizeFundingRate,
	annualizeHourlyFundingRate,
	createFundingOverviewCacheKey,
	createFundingOverviewRows,
	normalizeFundingRateToHourly,
	normalizeOptionalTimestamp,
	scaleFundingOverviewCellsToTimeframe,
} from "#services/funding/funding-overview/funding-overview.utils";

describe("funding overview utils", () => {
	it("annualizes hourly funding rates", () => {
		expect(annualizeHourlyFundingRate(0.01)).toBeCloseTo(87.6);
		expect(annualizeHourlyFundingRate(undefined)).toBeUndefined();
	});

	it("normalizes funding rates from their source interval", () => {
		expect(normalizeFundingRateToHourly(0.008, 8)).toBeCloseTo(0.001);
		expect(annualizeFundingRate(0.008, 8)).toBeCloseTo(8.76);
		expect(normalizeFundingRateToHourly(undefined, 8)).toBeUndefined();
	});

	it("groups exchange cells into one row per symbol", () => {
		const cells: FundingOverviewExchangeCell[] = [
			{
				exchange: "pacifica",
				sourceSymbol: "btc",
				fundingRate: 0.01,
				apr: 87.6,
			},
			{
				exchange: "hyperliquid",
				sourceSymbol: "BTC",
				fundingRate: 0.02,
				apr: 175.2,
			},
			{
				exchange: "ethereal",
				sourceSymbol: "ETH",
				fundingRate: -0.01,
				apr: -87.6,
			},
		];

		expect(createFundingOverviewRows(cells)).toEqual([
			{
				symbol: "BTC",
				exchanges: {
					pacifica: {
						exchange: "pacifica",
						sourceSymbol: "BTC",
						fundingRate: 0.01,
						apr: 87.6,
					},
					hyperliquid: {
						exchange: "hyperliquid",
						sourceSymbol: "BTC",
						fundingRate: 0.02,
						apr: 175.2,
					},
				},
			},
			{
				symbol: "ETH",
				exchanges: {
					ethereal: {
						exchange: "ethereal",
						sourceSymbol: "ETH",
						fundingRate: -0.01,
						apr: -87.6,
					},
				},
			},
		]);
	});

	it("normalizes second timestamps to milliseconds", () => {
		expect(normalizeOptionalTimestamp(1000)).toBe(1000000);
		expect(normalizeOptionalTimestamp(1700000000000)).toBe(1700000000000);
		expect(normalizeOptionalTimestamp(undefined)).toBeUndefined();
	});

	it("normalizes market symbols to their base ticker", () => {
		const cells: FundingOverviewExchangeCell[] = [
			{
				exchange: "pacifica",
				sourceSymbol: "SOL",
				fundingRate: 0.01,
				apr: 87.6,
			},
			{
				exchange: "hyperliquid",
				sourceSymbol: "SOL-USDC",
				fundingRate: 0.02,
				apr: 175.2,
			},
			{
				exchange: "ethereal",
				sourceSymbol: "SOL_USD",
				fundingRate: -0.01,
				apr: -87.6,
			},
		];

		expect(createFundingOverviewRows(cells)).toEqual([
			{
				symbol: "SOL",
				exchanges: {
					pacifica: {
						exchange: "pacifica",
						sourceSymbol: "SOL",
						fundingRate: 0.01,
						apr: 87.6,
					},
					hyperliquid: {
						exchange: "hyperliquid",
						sourceSymbol: "SOL",
						fundingRate: 0.02,
						apr: 175.2,
					},
					ethereal: {
						exchange: "ethereal",
						sourceSymbol: "SOL",
						fundingRate: -0.01,
						apr: -87.6,
					},
				},
			},
		]);
	});

	it("omits rows with only zero funding values", () => {
		const rows = createFundingOverviewRows([
			{
				exchange: "pacifica",
				sourceSymbol: "BTC",
				fundingRate: 0,
				nextFundingRate: 0,
				apr: 0,
			},
		]);

		expect(rows).toEqual([]);
	});

	it("creates stable cache keys from filters", () => {
		expect(
			createFundingOverviewCacheKey("DAY", ["hyperliquid", "pacifica"]),
		).toBe("funding-overview:DAY:hyperliquid,pacifica");
	});

	it("scales hourly funding values to the selected timeframe", () => {
		expect(
			scaleFundingOverviewCellsToTimeframe(
				[
					{
						exchange: "pacifica",
						sourceSymbol: "BTC",
						fundingRate: 0.01,
						nextFundingRate: 0.02,
						apr: 87.6,
					},
				],
				"DAY",
			),
		).toEqual([
			{
				exchange: "pacifica",
				sourceSymbol: "BTC",
				fundingRate: 0.24,
				nextFundingRate: 0.48,
				apr: 87.6,
			},
		]);
	});
});
