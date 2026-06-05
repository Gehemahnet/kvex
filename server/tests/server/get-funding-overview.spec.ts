import { describe, expect, it } from "vitest";
import { parseFundingOverviewQuery } from "../../src/server/http/funding-overview-query";
import { BadRequestError } from "../../src/server/http/http-errors";

describe("parseFundingOverviewQuery", () => {
	it("parses timeframe and defaults exchanges", () => {
		expect(parseFundingOverviewQuery("/funding/overview?timeframe=day")).toEqual({
			timeframe: "DAY",
			exchanges: ["hyperliquid", "pacifica", "ethereal", "nado", "okx"],
		});
	});

	it("parses exchange filters", () => {
		expect(
			parseFundingOverviewQuery(
				"/funding/overview?timeframe=YEAR&exchanges=ethereal,pacifica",
			),
		).toEqual({
			timeframe: "YEAR",
			exchanges: ["ethereal", "pacifica"],
		});
	});

	it("throws on missing timeframe", () => {
		expect(() => parseFundingOverviewQuery("/funding/overview")).toThrowError(
			BadRequestError,
		);
	});
});
