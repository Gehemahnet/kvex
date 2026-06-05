import { describe, expect, it } from "vitest";
import { parseMarketSnapshotsQuery } from "../../src/server/http/markets/market-snapshots-query";

describe("parseMarketSnapshotsQuery", () => {
	it("uses all supported exchanges by default", () => {
		expect(parseMarketSnapshotsQuery("/markets/snapshots")).toEqual({
			exchanges: ["hyperliquid", "pacifica", "ethereal", "nado", "okx"],
		});
	});

	it("normalizes optional symbol and exchange filters", () => {
		expect(
			parseMarketSnapshotsQuery(
				"/markets/snapshots?symbol=btc&exchanges=pacifica,hyperliquid,pacifica",
			),
		).toEqual({
			symbol: "BTC",
			exchanges: ["pacifica", "hyperliquid"],
		});
	});

	it("rejects unsupported exchanges", () => {
		expect(() =>
			parseMarketSnapshotsQuery("/markets/snapshots?exchanges=unknown"),
		).toThrowError("Unsupported exchanges: unknown");
	});
});
