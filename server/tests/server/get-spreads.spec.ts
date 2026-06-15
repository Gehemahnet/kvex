import { describe, expect, it } from "vitest";
import { parseSpreadsQuery } from "../../src/server/http/spreads/spreads-query";

describe("parseSpreadsQuery", () => {
	it("uses all supported exchanges by default", () => {
		expect(parseSpreadsQuery("/spreads")).toEqual({
			exchanges: ["hyperliquid", "pacifica", "ethereal", "nado", "okx", "variational"],
		});
	});

	it("normalizes optional filters", () => {
		expect(
			parseSpreadsQuery(
				"/spreads?symbol=btc&exchanges=pacifica,hyperliquid&minPriceSpreadPercent=0.01&maxSnapshotAgeMs=5000",
			),
		).toEqual({
			symbol: "BTC",
			exchanges: ["pacifica", "hyperliquid"],
			minPriceSpreadPercent: 0.01,
			maxSnapshotAgeMs: 5000,
		});
	});

	it("normalizes optional position size filters", () => {
		expect(parseSpreadsQuery("/spreads?positionSizeUsd=1000")).toEqual({
			exchanges: ["hyperliquid", "pacifica", "ethereal", "nado", "okx", "variational"],
			positionSizeUsd: 1000,
		});
	});

	it("normalizes optional minimum occurrence filters", () => {
		expect(parseSpreadsQuery("/spreads?minOccurrences=3")).toEqual({
			exchanges: ["hyperliquid", "pacifica", "ethereal", "nado", "okx", "variational"],
			minOccurrences: 3,
		});
	});

	it("normalizes optional minimum lifetime filters", () => {
		expect(parseSpreadsQuery("/spreads?minLifetimeMs=5000")).toEqual({
			exchanges: ["hyperliquid", "pacifica", "ethereal", "nado", "okx", "variational"],
			minLifetimeMs: 5000,
		});
	});

	it("normalizes optional holding period filters", () => {
		expect(parseSpreadsQuery("/spreads?holdingPeriodHours=8")).toEqual({
			exchanges: ["hyperliquid", "pacifica", "ethereal", "nado", "okx", "variational"],
			holdingPeriodHours: 8,
		});
	});

	it("rejects invalid percent filters", () => {
		expect(() =>
			parseSpreadsQuery("/spreads?minPriceSpreadPercent=-1"),
		).toThrowError(
			"Query param `minPriceSpreadPercent` must be a non-negative number",
		);
	});

	it("rejects invalid max snapshot age filters", () => {
		expect(() =>
			parseSpreadsQuery("/spreads?maxSnapshotAgeMs=-1"),
		).toThrowError(
			"Query param `maxSnapshotAgeMs` must be a non-negative number",
		);
	});

	it("rejects invalid position size filters", () => {
		expect(() =>
			parseSpreadsQuery("/spreads?positionSizeUsd=-1"),
		).toThrowError(
			"Query param `positionSizeUsd` must be a non-negative number",
		);
	});

	it("rejects invalid minimum occurrence filters", () => {
		expect(() =>
			parseSpreadsQuery("/spreads?minOccurrences=1.5"),
		).toThrowError(
			"Query param `minOccurrences` must be a non-negative integer",
		);
	});

	it("rejects invalid minimum lifetime filters", () => {
		expect(() =>
			parseSpreadsQuery("/spreads?minLifetimeMs=-1"),
		).toThrowError(
			"Query param `minLifetimeMs` must be a non-negative number",
		);
	});

	it("rejects invalid holding period filters", () => {
		expect(() =>
			parseSpreadsQuery("/spreads?holdingPeriodHours=-1"),
		).toThrowError(
			"Query param `holdingPeriodHours` must be a non-negative number",
		);
	});
});
