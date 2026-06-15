import { describe, expect, it } from "vitest";
import {
	parseFundingQuery,
} from "../../src/server/http/funding-query";
import { BadRequestError } from "../../src/server/http/http-errors";

describe("parseFundingQuery", () => {
	it("parses required params and defaults exchanges", () => {
		expect(parseFundingQuery("/funding?symbol=btc&timeframe=day")).toEqual({
			symbol: "BTC",
			timeframe: "DAY",
			exchanges: [
				"hyperliquid",
				"pacifica",
				"ethereal",
				"nado",
				"okx",
				"variational",
			],
		});
	});

	it("parses and deduplicates exchange filters", () => {
		expect(
			parseFundingQuery(
				"/funding?symbol=ETH&timeframe=WEEK&exchanges=pacifica,hyperliquid,pacifica",
			),
		).toEqual({
			symbol: "ETH",
			timeframe: "WEEK",
			exchanges: ["pacifica", "hyperliquid"],
		});
	});

	it("throws on invalid timeframe", () => {
		expect(() =>
			parseFundingQuery("/funding?symbol=BTC&timeframe=HOUR"),
		).toThrowError(BadRequestError);
	});

	it("throws on invalid exchange", () => {
		expect(() =>
			parseFundingQuery("/funding?symbol=BTC&timeframe=DAY&exchanges=binance"),
		).toThrowError(BadRequestError);
	});
});
