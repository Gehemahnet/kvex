import { describe, expect, it } from "vitest";
import {
	parseSpreadsSocketPayload,
} from "../../src/server/realtime/market-data-socket.utils";

describe("market data socket utils", () => {
	it("parses spread subscription filters", () => {
		expect(
			parseSpreadsSocketPayload({
				exchanges: ["hyperliquid", "okx"],
				symbol: "btc",
				minPriceSpreadPercent: 0.01,
				maxSnapshotAgeMs: 120_000,
				positionSizeUsd: 1_000,
				minOccurrences: 3,
				minLifetimeMs: 5_000,
				holdingPeriodHours: 8,
			}),
		).toEqual({
			exchanges: ["hyperliquid", "okx"],
			symbol: "BTC",
			minPriceSpreadPercent: 0.01,
			maxSnapshotAgeMs: 120_000,
			positionSizeUsd: 1_000,
			minOccurrences: 3,
			minLifetimeMs: 5_000,
			holdingPeriodHours: 8,
		});
	});

	it("rejects invalid spread subscription filters", () => {
		expect(() =>
			parseSpreadsSocketPayload({
				exchanges: ["hyperliquid"],
				maxSnapshotAgeMs: -1,
			}),
		).toThrowError("maxSnapshotAgeMs must be a non-negative number");
	});

	it("rejects invalid position size filters", () => {
		expect(() =>
			parseSpreadsSocketPayload({
				exchanges: ["hyperliquid"],
				positionSizeUsd: -1,
			}),
		).toThrowError("positionSizeUsd must be a non-negative number");
	});

	it("rejects invalid minimum occurrence filters", () => {
		expect(() =>
			parseSpreadsSocketPayload({
				exchanges: ["hyperliquid"],
				minOccurrences: 1.5,
			}),
		).toThrowError("minOccurrences must be a non-negative integer");
	});

	it("rejects invalid minimum lifetime filters", () => {
		expect(() =>
			parseSpreadsSocketPayload({
				exchanges: ["hyperliquid"],
				minLifetimeMs: -1,
			}),
		).toThrowError("minLifetimeMs must be a non-negative number");
	});

	it("rejects invalid holding period filters", () => {
		expect(() =>
			parseSpreadsSocketPayload({
				exchanges: ["hyperliquid"],
				holdingPeriodHours: -1,
			}),
		).toThrowError("holdingPeriodHours must be a non-negative number");
	});
});
