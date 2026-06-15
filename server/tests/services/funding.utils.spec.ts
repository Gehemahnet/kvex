import { describe, expect, it } from "vitest";
import { ServiceError } from "../../src/common/errors/service-errors";
import { mapFundingSettledResult } from "#services/funding/funding-core/funding.error-handler";
import type { FundingSeries } from "#services/funding/funding-core/funding.types";
import {
	annualizeFundingPoints,
	createFundingSeries,
	normalizeFundingPoints,
} from "#services/funding/funding-core/funding.utils";

describe("funding utils", () => {
	it("annualizes funding points", () => {
		expect(
			annualizeFundingPoints(
				[
					{
						timestamp: 1,
						fundingRate: 0.01,
						nextFundingRate: 0.02,
					},
				],
				12,
			),
		).toEqual([
			{
				timestamp: 1,
				fundingRate: 0.12,
				nextFundingRate: 0.24,
			},
		]);
	});

	it("adds funding metadata to the series", () => {
		expect(
			createFundingSeries("ethereal", "BTC", "BTCUSD", [], {
				isFundingAdapted: true,
				requestedTimeframe: "YEAR",
				sourceTimeframe: "MONTH",
			}),
		).toEqual({
			exchange: "ethereal",
			symbol: "BTC",
			sourceSymbol: "BTCUSD",
			points: [],
			latest: undefined,
			isFundingAdapted: true,
			requestedTimeframe: "YEAR",
			sourceTimeframe: "MONTH",
		});
	});

	it("normalizes timestamps and sorts points ascending", () => {
		expect(
			normalizeFundingPoints([
				{ timestamp: 7205000, fundingRate: 3 },
				{ timestamp: 3605000, fundingRate: 2 },
				{ timestamp: 1000, fundingRate: 1 },
			]),
		).toEqual([
			{ timestamp: 0, fundingRate: 1 },
			{ timestamp: 3600000, fundingRate: 2 },
			{ timestamp: 7200000, fundingRate: 3 },
		]);
	});

	it("maps fulfilled result to data", () => {
		const series: FundingSeries = {
			exchange: "hyperliquid",
			symbol: "BTC",
			sourceSymbol: "BTC",
			points: [],
			latest: undefined,
			isFundingAdapted: false,
			requestedTimeframe: "DAY",
			sourceTimeframe: "DAY",
		};

		expect(
			mapFundingSettledResult({
				exchange: "hyperliquid",
				result: {
					status: "fulfilled",
					value: series,
				},
			}),
		).toEqual({ data: series });
	});

	it("maps rejected ServiceError to exchange error payload", () => {
		expect(
			mapFundingSettledResult({
				exchange: "pacifica",
				result: {
					status: "rejected",
					reason: new ServiceError({
						service: "pacifica",
						code: "SYMBOL_NOT_FOUND",
						message: "Symbol BTC was not found on pacifica",
					}),
				},
			}),
		).toEqual({
			error: {
				exchange: "pacifica",
				code: "SYMBOL_NOT_FOUND",
				message: "Symbol BTC was not found on pacifica",
			},
		});
	});
});
